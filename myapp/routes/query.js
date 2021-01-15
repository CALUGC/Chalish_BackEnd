const { json } = require('express');
var express = require('express');
var router = express.Router();

var mysql = require('mysql');


var pool  = mysql.createPool({
    user: 'root',
    password: 'R00t_t00r',
    host: 'localhost',
    port: '3306',
    database: 'sqlapp',
    // 無可用連線時是否等待pool連線釋放(預設為true)
    // waitForConnections : true,
    // // 連線池可建立的總連線數上限(預設最多為10個連線數)
    // connectionLimit : 10
});

router.get('/', function(req, res, next) {
	res.send('pong') //for test root respose
});

router.get('/vocab_set/:table/:cnt', function (req, res, next) {
	var table_name = "vocab_" + req.params.table + "_tbl";
	var cnt = req.params.cnt;
	
	try {
		const result = pool.query('select ENG,CH from vocab_7000_tbl where id = ?;', [cnt], function (err, col, fields) {
			if (err) throw err;

			res.send({
				'status': 'success',
				'result' : col[0]
			});
		});
	} catch (error) {
		console.log(error);
		res.send(500, {
			'status': 'fail',
			'result' : error
		});
	}
});


router.get('/get_vocab_set/:table/:cnt', function(req, res, next) {
	var strTableName = "vocab_"+req.params.table+"_tbl";
	var cnt = req.params.cnt;
 	 // 取得連線池的連線
	pool.getConnection(function(err, connection) {
	
	    if (err) 
	    {
	    	console.log("ERRORRRRRRR")
	        throw(err);
	    }
	    else
	    {
			if(req.params.table=="MIX"){
				connection.query( "(SELECT ENG,CH FROM vocab_100000_tbl ORDER BY RAND() LIMIT "+(cnt*4/5).toString()+" )\
					UNION\
					(SELECT ENG,CH FROM sentences_50_tbl ORDER BY RAND() LIMIT "+(cnt/5).toString()+")\
					ORDER BY ENG;", function(err, sqlres) {
					res.json(sqlres)
					connection.release();
				});
			}
			else if(req.params.table=="SENTENCE"){
				connection.query( "SELECT ENG,CH FROM sentences_50_tbl ORDER BY RAND() ;", function(err, sqlres) {
					res.json(sqlres)
					connection.release();
				});
			}
			else{
				connection.query( "SELECT ENG,CH FROM "+strTableName+ " ORDER BY RAND() LIMIT "+cnt+";", function(err, sqlres) {
					res.json(sqlres)
					connection.release();
				});
			}
			
	    }
	});
	
});


router.get('/get_vocab_set/', function(req, res, next) {
 	 // 取得連線池的連線
	pool.getConnection(function(err, connection) {
	
	    if (err) 
	    {
	    	console.log("ERRORRRRRRR")
	        throw(err);
	    }
	    else
	    {
			connection.query( "SELECT *	\
								FROM `table_7000` AS t1 JOIN (SELECT ROUND(RAND() * ((SELECT MAX(id) FROM `table_7000`)-(SELECT MIN(id) FROM `table_7000`))+(SELECT MIN(id) FROM `table_7000`)) AS id) AS t2	\
								WHERE t1.id >= t2.id	\
								ORDER BY t1.id LIMIT 5;", function(err, sqlres) {
					console.log(sqlres)
					console.log(JSON.stringify(sqlres))
					// console.log("\n")
					res.json(sqlres)
					connection.release();
				});
			

			
			

	    }
	});
	


});

router.get('/updateUserStatus/:uid', function(req, res, next) {
	// 取得連線池的連線
	var uid = req.params.uid;
  pool.getConnection(function(err, connection) {
  
	  if (err) 
	  {
		  console.log("ERRORRRRRRR")
		  throw(err);
	  }
	  else
	  {
		  connection.query( "UPDATE userInfo_tbl SET lastLogin=CURRENT_TIMESTAMP WHERE uid='"+uid+"';", function(err, sqlres) {
				  console.log(sqlres)
				  console.log(JSON.stringify(sqlres))
				  res.json(sqlres)
				  connection.release();
			  });
		  

		  
		  

	  }
  });
  


});

router.get('/insertUser/:uid/:name/:photoUrl', function(req, res, next) {
	// 取得連線池的連線
	var uid = req.params.uid;
	var name = req.params.name;
	var photoUrl = req.params.photoUrl;
  pool.getConnection(function(err, connection) {
  
	  if (err)
	  {
		  console.log("ERRORRRRRRR")
		  throw(err);
	  }
	  else
	  {
		  connection.query( "INSERT INTO userInfo_tbl (`uid`,`name`,`photoUrl`) \
							SELECT '"+uid+"','"+name+"','"+photoUrl+"' \
							 WHERE NOT EXISTS \
							 ( SELECT uid FROM userInfo_tbl \
							 WHERE uid = '"+uid+"');", function(err, sqlres) {
								console.log(err)
							console.log(sqlres)
				  console.log(JSON.stringify(sqlres))
				  res.json(sqlres)
				  connection.release();
			  });
		  

		  
		  

	  }
  });
  


});

module.exports = router;
