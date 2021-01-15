//import express 和 ws 套件
const { query, json } = require('express')
const express = require('express')
const fetch = require('node-fetch');

var request = require('request');

var router = express.Router();

const SocketServer = require('ws').Server

//指定開啟的 port
const PORT = 3002

//創建 express 的物件，並綁定及監聽 3000 port ，且設定開啟後在 console 中提示
const server = express()
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

//將 express 交給 SocketServer 開啟 WebSocket 的服務
const wss = new SocketServer({ server })

var connections = {};
var mapRoomNumber = new Map(); 

const asyncInterval = async (callback, ms, triesLeft) => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        if (await callback()) {
          resolve();
          clearInterval(interval);
        } else if (triesLeft <= 1) {
          reject();
          clearInterval(interval);
        }
        triesLeft--;
      }, ms);
    });
  }

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}


function fun_getJSON(url) {
    return new Promise((resolve,reject) => {
        fetch(url)
        .then(res => resolve(res.json()))
        .catch(err => {
            console.log(res.toString())
            reject(err)
        })
    })
}


async function fun_getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

async function fun_start_game(p1,p2,iRoundCnt){
    p1.send("i am in room "+p1.roomNumber)
    p2.send("i am in room "+p1.roomNumber)
    console.log("p1_and p2_in_game.")

    // const fun_backToPlay = async () => {
    //     if (p1.backToPlay && p2.backToPlay){
    //         console.log("they are both backToPlay!");
    //         return true
    //     }
    //     else{
    //         console.log(p1.id+ " or " +  p2.id+ " not backToPlay!")
    //         return false
    //     }
        
    // }

    // await fun_backToPlay(fun_recvVocab,100,50);

    const fun_recvVocab = async () => {
        if (p1.recvVocab && p2.recvVocab){
            console.log("they are both recv Vocab!");
            return true
        }
        else{
            console.log(p1.id+ " and " +  p2.id+ " not recive yet!")
            return false
        }
        
    }

    if(iRoundCnt==1){
        var vocab = undefined
        try{
            vocab = await fun_getJSON("http://localhost:3000/query/get_vocab_set/"+p1.vocabCnt.toString()+"/20")
        }
        catch(e){
            console.log(e)
            vocab = JSON.parse('[{"ENG":"fine","CH":"使純;澄清;使精細"},{"ENG":"upright","CH":"垂直;豎立;直立的東西"},{"ENG":"spaghetti","CH":"義大利麵條"},{"ENG":"worm","CH":"蠕蟲"},{"ENG":"clover","CH":"苜蓿"},{"ENG":"in","CH":"在…之內"},{"ENG":"dwelling","CH":"住處;寓所"},{"ENG":"doom","CH":"注定;使失敗;毀滅"},{"ENG":"brow","CH":"眉頭;眉毛"},{"ENG":"saw","CH":"鋸;鋸開"},{"ENG":"racial","CH":"種族的"},{"ENG":"overseas","CH":"國外的"},{"ENG":"edit","CH":"編輯;校訂"},{"ENG":"clothe","CH":"給...穿衣;為...提供衣服"},{"ENG":"ticket","CH":"票;罰單"},{"ENG":"sponsor","CH":"發起者;主辦者"},{"ENG":"ministry","CH":"(常大寫)(政府的)部"},{"ENG":"ban","CH":"禁止;取締"},{"ENG":"attractive","CH":"有吸引力的;引人注目的"},{"ENG":"math","CH":"數學"}]')
        }

        console.log("return vocab is "+ JSON.stringify(vocab))
        console.log(p1.id+ " and "+p2.id+ " is ready for game.")
        var iAnsidx = await fun_getRandomInt(100000)
        p1.send(JSON.stringify(vocab))
        p2.send(JSON.stringify(vocab))
        p1.send("iAnsidx:"+iAnsidx.toString())
        p2.send("iAnsidx:"+iAnsidx.toString())

        try{
            await asyncInterval(fun_recvVocab,100,50);
        }
        catch(e){
            
        }
    }

    await sleep(3000)
    p1.send("gotoRound")
    p2.send("gotoRound")
    console.log("gotoRound")
    
    p1.ansOpt = -1
    p2.ansOpt = -1
    p1.ansScore = -1
    p2.ansScore = -1
    var p1ScoreSend = false,p2ScoreSend  = false

    const fun_geAns = async () => {
        if(p1.ansScore!=-1 && !p1ScoreSend){
            p1ScoreSend = true
            p2.send("ansAndScore:"+p1.ansOpt.toString()+p1.ansScore.toString())
        }
        if(p2.ansScore!=-1 && !p2ScoreSend){
            p2ScoreSend = true
            p1.send("ansAndScore:"+p2.ansOpt.toString()+p2.ansScore.toString())
        }
        if (p1ScoreSend && p2ScoreSend){
            console.log("they are both answered.");
            return true
        }
        else{
            return false
        }
        
    }

    
    // var iAnsidx = await fun_getRandomInt(4)
    // p1.send("start_round"+iAnsidx)
    // p2.send("start_round"+iAnsidx)
    try{
        await asyncInterval(fun_geAns,100,50);
        p1.send("stop_timer")
        p2.send("stop_timer")
    }
    catch(e){
        console.log("fun_genAnsException")
    }

    await sleep(2000)

    p1.send("gotoWait")
    p2.send("gotoWait")

    
    if(iRoundCnt<5){
        fun_start_game(p1,p2,iRoundCnt+1)
    }
}

async function lobby(p1,p2){ //p1 is host
    p1.send("p2photo"+"@"+p2.photoUrl+"@"+p2.name)
    await sleep(300)
    p2.send("p2photo"+"@"+p1.photoUrl+"@"+p1.name)
    p1.ready = false
    p1.readySend = false
    p2.ready = false
    p2.readySend = false
    p1.LeftGame = false
    p2.LeftGame = false
    var bLeftGame = true
    const funGetReady = async () => {
         console.log(p1.ready.toString() + p1.readySend.toString() + p2.ready.toString() + p2.readySend.toString()+p1.toString()+p2.toString()+p1.LeftGame.toString()+p2.LeftGame.toString())
        if(p1.ready && !p1.readySend){
            p1.readySend = true
            p2.send("p2_ready")
        }
        else if(!p1.ready && p1.readySend){
            p1.readySend = false
            p2.send("p2_unready")
        }

        if(p2.ready && !p2.readySend){
            p2.readySend = true
            p1.send("p2_ready")
        }
        else if(!p2.ready && p2.readySend){
            p2.readySend = false
            p1.send("p2_unready")
        }
        
        if(p1.LeftGame || p2.LeftGame){
            return true
        }
        else if (p1.readySend && p2.readySend){
            return true
        }
        else{
            return false
        }
        
    }
    await asyncInterval(funGetReady,500,1200);
    if(p1.LeftGame==false&&p2.LeftGame==false){
        p1.send("gotoWait")
        p2.send("gotoWait")
        fun_start_game(p1,p2,1)
    }
    else{
        if(p1.LeftGame)     p2.close(1000,"friendLeave")
        else    p1.close(1000,"friendLeave")
    }
} 

//當 WebSocket 從外部連結時執行
wss.on('connection', ws => {
    
    //連結時執行此 console 提示r
    console.log('Client connected')


    ws.on('message', data => {
        console.log(data)
        //data 為 Client 發送的訊息，現在將訊息原封不動發送出去
        if(data.substring(0,10)=="createRoom"){
            //format is createRoom@vocabCnt@photoUrl@name
            var arrDataSplit = data.split("@")
            ws.vocabCnt = arrDataSplit[1].toString()
            console.log("vocab mode is "+ ws.vocabCnt.toString())
            ws.photoUrl = arrDataSplit[2]
            ws.name = arrDataSplit[3]
            console.log(ws.vocabCnt.toString())
            var strRoomNumber
            do{
                strRoomNumber = (Math.floor(Math.random(10000) * Math.floor(10000))).toString()
                strRoomNumber = "0".repeat(4-strRoomNumber.length)+strRoomNumber
                console.log(strRoomNumber)
            }
            while(mapRoomNumber.has(strRoomNumber))
            
            ws.roomNumber = strRoomNumber
            connections[strRoomNumber] = ws
            ws.send("roomNumber@"+strRoomNumber.toString())

        }
        if(data.substring(0,9)=="enterRoom"){
            //format is enterRoom@roomNumber@photoUrl@name
            var arrDataSplit = data.split("@")
            ws.roomNumber = arrDataSplit[1]
            ws.photoUrl = arrDataSplit[2]
            ws.name = arrDataSplit[3]
            lobby(connections[ws.roomNumber],ws)
        }
        if(data=="recived vocab"){
            ws.recvVocab = true
        }
        if(data=="backToPlay"){
            ws.backToPlay = true
        }
        if(data.length>6 && data.substring(0,6)=="ansOpt"){
            ws.ansOpt = parseInt(data[6])
            ws.ansScore = parseInt(data.substring(8,data.length))
            console.log("set "+toString(ws.id)+"'s ans opt to "+toString(ws.ansOpt)+" and score = "+ws.ansScore)
        }
        if(data=="setBtnStatusFalse"){
            ws.ready = false
            console.log("setBtnStatus to false ")
        }
        if(data=="setBtnStatusTrue"){
            ws.ready = true
            console.log("setBtnStatus to true ")
        }
        ws.send(data)
    })

    //當 WebSocket 的連線關閉時執行
    ws.on('close', () => {
        console.log('Close connected')
        ws.LeftGame=true
        mapRoomNumber.delete(ws.roomNumber)
        delete connections[ws.roomNumber];  
        console.log("cnt of room after delete   is  "+ Object.keys(connections).length)
    })
})