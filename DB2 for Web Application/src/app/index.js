'use strict';
var express = require('express');
var path = require('path');
var IO = require('socket.io');
var router = express.Router();
var usersCred = require('./utils/FileHandler').users;

var ConnectionPool = require("./utils/ConnectionPool").connectionPool;
var dbDriver = require("./utils/DataLoad").dataLoad;

var app = express();
var server = require('http').Server(app);
app.use(express.static(__dirname));
app.set('views', __dirname);
app.set('view engine', 'hbs');

var args = process.argv.splice(2)

var product = true;
if(args.length>=1){
    if(args[0]=="product=true")
        product = false;
}


var socketIO = IO(server);
var socketList = {};
var userNum = {};
var usersCredList = new usersCred();
var dbCredList = usersCredList.read();

var userAuth = {};
var usrPwd = usersCredList.readUser();

socketIO.on('connection', function (socket) {
    var url = socket.request.headers.referer;
    console.log(socket.request.headers.referer);
    var splited = url.split('/');
    var userID = splited[splited.length - 1];
    if(!userNum[userID]) userNum[userID] = 1;
    else userNum[userID]++;

    userAuth[userID]++;

    var newUserID = userID + userNum[userID];
    console.log(newUserID);

    socket.on('start', function (params) {

        socket.join(newUserID);
        var num = parseInt(params.num);
        var purSize = parseInt(params.purSize)||5;
        var custSize = parseInt(params.custSize)||2;
        delete params.num;
        delete params.purSize;
        delete params.custSize;
        var cred = params;
        dbCredList[userID] = cred;
        usersCredList.write(dbCredList);
        console.log(userID + 'join');

        let pop = new dbDriver();
        let run = {
            success: () => {
                if (socketList[newUserID]) {
                    socketList[newUserID].stop();
                    delete socketList[newUserID];
                }
                if(!socketList[newUserID]){
                    console.log("refresh");
                    socketList[newUserID] = new ConnectionPool();
                }
                socketList[newUserID].setSocket(socketIO, 'msg', newUserID);
                socketList[newUserID].start(cred, purSize, custSize, num, null);
            },
            error: () => {
                socketIO.to(newUserID).emit('sys', 'nocred');
            },
            deferred: () => {
                socketIO.to(newUserID).emit('sys', 'nodata');
            }
        }
        pop.initPool(cred, 1, product);
        pop.testMockData(run);
    });

    socket.on('stop', function () {
        if(socketList[newUserID]) {
            socketList[newUserID].stop();
            delete socketList[newUserID];
        }
    });

    socket.on('disconnect', function (userName) {

        if(socketList[newUserID]) {
            socketList[newUserID].stop();
            delete socketList[newUserID];
        }
        userAuth[userID]--;
        if(userAuth[userID]==1) {
            delete userAuth[userID];
        }
        socket.leave(newUserID);
        socketIO.to(newUserID).emit('sys', userID + 'signs out');
        console.log(userID + 'signs out');
    });

    socket.on('message', function (msg) {
    });

});
router.get('/:userID/:path', function(req, res){
    var user = req.params.userID;
    var path = req.params.path;
    if(userAuth[user]>0){
        if(path == 'upload'){
            var querys = req._parsedOriginalUrl.query.split("&");
            let db_oper = {};
            querys.forEach((stat) => {
                let prop = stat.split('=');
                prop[1] = decodeURIComponent(prop[1]);
                db_oper[prop[0]] = prop[1];
            });
            let pop = new dbDriver();
            let userid = db_oper.userid;
            delete db_oper.userid;
            if (db_oper.cmd == 'test') {
                let result = {
                    severity: "error",
                    title: "FAILED!",
                    body: "Failed to connect to the database."
                }
                delete db_oper.cmd;
                console.log(db_oper);
                dbCredList[userid] = db_oper;
                usersCredList.write(dbCredList);
                pop.initPool(db_oper,1,true);
                let callBack = (resultDB) => {
                    if(resultDB&&resultDB[0]){
                        result = {
                            severity: "success",
                            title: "SUCCESS!",
                            body: "Successfully connect to the database."
                        }
                    }
                    res.send(JSON.stringify(result));
                }
                pop.testConnection(callBack)
            }
            else if (db_oper.cmd == 'load') {
                let result = {
                    severity: "error",
                    title: "FAILED!",
                    body: "Failed to load the mock data."
                }
                delete db_oper.cmd;
                dbCredList[userid] = db_oper;
                usersCredList.write(dbCredList);
                pop.initPool(db_oper,1,true);
                let callBack3 = {
                    success: () => {
                        result = {
                            severity: "success",
                            title: "SUCCESS!",
                            body: "Successfully load the mock data."
                        }
                        res.send(JSON.stringify(result));
                    },
                    error: () => {
                        res.send(JSON.stringify(result));
                    }
                }
                let callBack2 = () => {
                    pop = new dbDriver();
                    pop.initPool(db_oper,1,true);
                    pop.importData(callBack3);
                }
                let callBack1 = {
                    success:callBack2,
                    error: () => { res.send(JSON.stringify(result))}
                }
                let callBack = {
                    success: () => {
                        console.log("success");
                        result = {
                            severity: "info",
                            title: "ALREADY EXISTS!",
                            body: "There's already mock data in the certain db table."
                        }
                        res.send(JSON.stringify(result));
                    },
                    error: () => {
                        pop = new dbDriver();
                        pop.initPool(db_oper,1,true);
                        pop.importTable(callBack1);
                    },
                    deferred: callBack2
                }
                pop.testMockData(callBack);
            }
            else if (db_oper.cmd == 'clear') {
                let result = {
                    severity: "error",
                    title: "FAILED!",
                    body: "Failed to clear the table data."
                };
                delete db_oper.cmd;
                dbCredList[userid] = db_oper;
                usersCredList.write(dbCredList);
                pop.initPool(db_oper,1,true);
                let callBack = {
                    success: () => {
                        result = {
                            severity: "success",
                            title: "SUCCESS!",
                            body: "Successfully clear the table data."
                        }
                        res.send(JSON.stringify(result));
                    },
                    error: () => {
                        res.send(JSON.stringify(result));
                    }
                }
                pop.cleanData(callBack);
            }
        }
    }
    else {
        res.location('index.html');
        res.send(302);
    }
});
router.get('/:userID', function (req, res) {
    var userID = req.params.userID;
    if(userAuth[userID]>0) {
        let cred = {hostname: "", port: "", db: "", username: "", password: ""};
        if (dbCredList[userID]) cred = dbCredList[userID]
        let hostname = cred.hostname, port = cred.port, db = cred.db, username = cred.username, password = cred.password;
        res.render('user', {
            userID: userID,
            hostname, port, db, username, password
        });
    }
    else{
        if(userID=='login'){
            var querys = req._parsedOriginalUrl.query.split("&");
            let params = {};
            querys.forEach((item)=>{
                params[item.split('=')[0]] = item.split('=')[1];
            });
            if(usrPwd[params.username] && usrPwd[params.username]==params.password){
                if(!userAuth[params.username])userAuth[params.username] = 1;
                res.send("{\"result\":\"success\",\"user\":\""+params.username+"\"}");
            }
            else{
                res.end("{\"result\":\"unknown user\"}");
            }
            console.log(req._parsedOriginalUrl.query);
        }
        else if(userID=='signup'){
            var querys = req._parsedOriginalUrl.query.split("&");
            let params = {};
            querys.forEach((item)=>{
                params[item.split('=')[0]] = item.split('=')[1];
            });
            if(!usrPwd[params.username]){
                usrPwd[params.username] = params.password;
                usersCredList.writeUser(usrPwd);
                userAuth[params.username] = 1;
                res.send("{\"result\":\"success\",\"user\":\""+params.username+"\"}");
            }
            else{
                res.end("{\"result\":\"existed user\"}");
            }
        }
        else{
            res.location('index.html');
            res.sendStatus(302);
        }
    }
});

console.log(__dirname);
app.use('/', router);
server.listen(8888, function () {
    console.log('server listening on port 8888');
});
