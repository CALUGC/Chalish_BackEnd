//import express 和 ws 套件
const { query, json } = require('express')
const express = require('express')
const fetch = require('node-fetch');

var request = require('request');

var router = express.Router();

const SocketServer = require('ws').Server

//指定開啟的 port
const PORT = 3001

//創建 express 的物件，並綁定及監聽 3000 port ，且設定開啟後在 console 中提示
const server = express()
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

//將 express 交給 SocketServer 開啟 WebSocket 的服務
const wss = new SocketServer({ server })

var connections = {};
var connectionIDCounter = 0;


function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}


function fun_getJSON(url) {
    return new Promise((resolve,reject) => {
        fetch(url)
        .then(res => resolve(res.json()))
        .catch(err => reject(err))
    })
}


async function fun_getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

async function fun_start_game(p1,p2,iRoundCnt){
    p1.send("i am in"+p1.id)
    p2.send("i am in"+p2.id)
    console.log(p1.id+ " and "+p2.id+ " in_game.")

    await sleep(1000)

    p1.send("gotoWait")
    p2.send("gotoWait")

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
            vocab = await fun_getJSON("http://localhost:3000/query/get_vocab_set/"+p1.vocabCnt+"/20")
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

    
    if(iRoundCnt<5){
        fun_start_game(p1,p2,iRoundCnt+1)
    }
    else{
        p1.send("round5_end")
        p2.send("round5_end")
    }
}

//當 WebSocket 從外部連結時執行
wss.on('connection', ws => {
    ws.id = connectionIDCounter ++;
    console.log("ws.id = "+ws.id)
    connections[ws.id] = ws;
    
    var size = Object.keys(connections).length;
    console.log("size of connections is "+size.toString())
    //連結時執行此 console 提示r
    console.log('Client connected')


    ws.on('message', data => {
        console.log(data)
        //data 為 Client 發送的訊息，現在將訊息原封不動發送出去
        if(data.substring(0,9)=="need_play"){
            ws.score = 0
            ws.vocabCnt = parseInt( data.substring(10) )
            console.log(ws.vocabCnt.toString())
            ws.match = "need_play"
            Object.keys(connections).some( function(i){
                if(connections[i].match == "need_play" && i!= ws.id &&　ws.vocabCnt == connections[i].vocabCnt){
                    connections[i].match = ws.id
                    connections[ws.id].match = i
                    ws.send("p2photo:"+connections[i].photoUrl)
                    connections[i].send("p2photo:"+ws.photoUrl)
                    fun_start_game(connections[i],connections[ws.id],1)
                    return true
                }
            });
        }
        if(data=="recived vocab"){
            ws.recvVocab = true
        }
        if(data.substring(0,8)=="photoUrl"){
            ws.photoUrl = data.substring(9)
        }
        if(data=="backToPlay"){
            ws.backToPlay = true
        }
        if(data.length>6 && data.substring(0,6)=="ansOpt"){
            ws.ansOpt = parseInt(data[6])
            ws.ansScore = parseInt(data.substring(8,data.length))
            console.log("set "+toString(ws.id)+"'s ans opt to "+toString(ws.ansOpt)+" and score = "+ws.ansScore)
        }
        ws.send(data)
    })

    //當 WebSocket 的連線關閉時執行
    ws.on('close', () => {
        console.log('Close connected')
        delete connections[ws.id];  
        console.log("size of connections after delete   is  "+ Object.keys(connections).length)
    })
})