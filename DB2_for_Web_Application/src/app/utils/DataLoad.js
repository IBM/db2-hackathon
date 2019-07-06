'use strict';
const ibmdb = require('ibm_db');		//For connecting to DB
const Pool = require("ibm_db").Pool 	// For connection pooling
const async = require('async');

const first_names = ["Jim", "John", "Michael", "Omar", "Phyllis", "Mary", "Sheena", "Bob", "Robert", "Ignis", "Ingrid", "Amanda", "Jennifer", "Noah"]
let fnc=first_names.length;
const last_names = ["Goldberg", "Greene", "Richardson", "de Toulouse-Lautrec", "Porter", "Dormer", "Clooney", "Abeo", "Mansbridge"]
let lnc = last_names.length;
const salutations = ["Mr.", "Mrs.", "Ms.", "Sir", "Dr."]
let sc = salutations.length;

let DataLoad = function() {

    this.initPool = (cred, poolSize, prod) => {
        //ibmdb.debug(true);
        let connStr = "DATABASE=" + cred.db + ";UID=" + cred.username + ";PWD=" + cred.password + ";HOSTNAME=" + cred.hostname + ";port=" + cred.port +";PROTOCOL=TCPIP";
        console.log(connStr);
        if(this.pool){
            this.pool.cleanUp();
            this.pool.close();
        }
        this.pool = new Pool()
        this.pool.setMaxPoolSize(poolSize||1);
        this.pool.setConnectTimeout(500);
        this.pool.init(0, connStr);
        this.cred = cred;
        this.connStr = connStr;
        this.connNum = 0;
        this.queryNum = 0;
    }

    this.setPoolSize = (size) => {
        if(this.pool)
            this.pool.setMaxPoolSize(parseInt(size)||1);
    }

    this.getRandomInt = (minimum, maximum)=>{
        return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    }

    this.testConnection = (callBack) => {
        let sql = "select 1 from \"SYSIBM\".\"SYSTABLES\"";
        return this.singleQuery(sql, callBack);
    }

    this.runSQL = (conn, sql) => {
        let result;
        this.queryNum++;
        if(typeof sql === "string"){
            try {
                result = conn.querySync(sql);
            }
            catch (error){
                console.log(error);
            }
        }
        else if(sql.query && sql.startCall && sql.successCall && sql.errorCall){
            let {query, startCall, successCall, errorCall} = sql;
            if(typeof query === "string"){
                startCall(this.pool.poolSize, this.queryNum);
                try{
                    result = conn.querySync(query);
                    successCall(this.pool.poolSize, this.queryNum - 1);
                }
                catch(error){
                    errorCall(this.pool.poolSize, this.queryNum - 1);
                }
            }
        }
        this.queryNum--;
        return result;
    }

    this.testSQL = (sql, callBack) => {
        if(typeof sql === "string") sql = [sql];
        let {pool, connStr} = this;
        let exist = 0;
        //this.connNum++;
        pool.open(connStr, (err, conn) => {
           if(err){
               exist = -1; return ;
               if(callBack && callBack.error) callBack.error();
           }
           if(sql.length>0) {
               let result;
               sql.forEach((stat)=>{
                   this.runSQL(conn, stat);
               })
               conn.close();
               //this.connNum--;
               //console.log(result);
               exist = 1;
               if(callBack && callBack.success) callBack.success();
           }
        });
        return exist;
    }

    this.testSQLAsync = (sql, callBack) => {
        if(typeof sql === "string") sql = [sql];
        let {pool, connStr} = this;
        //this.connNum++;
        pool.open(connStr, (err, conn) => {
            let i = 0;
            async.whilst(() => i<sql.length, (next) => {
                let stat = sql[i++];
                this.runSQL(conn, stat);
                next();
            },(err)=>{
                conn.close();
                if(i==sql.length){
                    if(callBack && callBack.success) callBack.success();
                }
                else{
                    if(callBack && callBack.error) callBack.error();
                }
                //this.connNum--;
            });
        })
    }

    this.getConnNum = () => this.connNum;
    this.getQueryNum = () => this.queryNum;

    this.singleQuery = (sql, callBack) => {
        let {pool, connStr} = this;
        let result;
        //this.connNum++;
        pool.open(connStr, (err, conn) => {
            if(err){
              console.log(err);
            }
            result = this.runSQL(conn, sql);
            if(callBack) callBack(result);
            conn.close();
            //this.connNum--;
        });
    }

    this.testTable = (tabName, callBack) => {
        let sql = "select count(*) from "+tabName;
        let {pool, connStr} = this;
        let exist = -1;
        pool.open(connStr,(err, conn) => {
            if (err) {
                exist = -1;
                if(callBack && callBack.error) callBack.error();
            }
            try {
                let num = conn.querySync(sql)[0]['1'];
                console.log(num);
                if(parseInt(num)>0){
                    exist = 1;
                    console.log("success");
                    if(callBack && callBack.success) callBack.success();
                }
                else{
                    if(callBack && callBack.deferred) callBack.deferred();
                }
            }
            catch(err){
                exist = 0;
                if(callBack && callBack.error) callBack.error();
            }
        });
        return exist;
    }

    this.testMockData = (callBack) => {
        this.testTable("WEBSTORE.INVENTORY", callBack)
    }

    this.importTable = (callBack) => {
        let demo = require("./DDL").demo;
        let ddl_all = new demo().getDDL();
        let ddls = [];
        ddl_all.forEach((item)=>{
            let {tbName,ddl,privilege} = item;
            console.log(tbName);
            let fir = "DROP TABLE "+tbName;
            ddls = [...ddls,fir,ddl,...privilege];
        });
        this.testSQL(ddls, callBack);
    }

    this.getCustSQL = () => {
        let sqls = [];
        let getRandomInt = this.getRandomInt;
        for(let i=0;i<100;i++){
            let sql = "INSERT INTO \"WEBSTORE\".\"CUSTOMER\" (\"C_FIRST_NAME\",\"C_LAST_NAME\",\"C_SALUTATION\") VALUES('" + first_names[getRandomInt(0, fnc - 1)] + "' ,'" + last_names[getRandomInt(0, lnc - 1)] + "' ,'" + salutations[getRandomInt(0, sc - 1)] + "')"
            sqls.push(sql);
        }
        return sqls;
    }

    this.getInventorySQL = () => {
        let sqls = [];
        let getRandomInt = this.getRandomInt;
        for(let i=0;i<300;i++){
            let sql = "INSERT INTO \"WEBSTORE\".\"INVENTORY\" (\"INV_QUANTITY_ON_HAND\") VALUES(" + getRandomInt(0, 1000) + ")"
            sqls.push(sql);
        }
        return sqls;
    }

    this.importData = (callBack) => {
        let sqlCust = this.getCustSQL();
        let sqlInvet = this.getInventorySQL();
        let sqls = [...sqlCust,...sqlInvet];
        this.testSQL(sqls, callBack);
    }

    this.cleanData = (callBack) => {
        this.importTable(callBack);
    }

    this.testData = () => {

    }

}

module.exports.dataLoad = DataLoad;
