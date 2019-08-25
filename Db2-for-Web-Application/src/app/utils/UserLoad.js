'use strict';
const async = require('async');

let minTimeout = 3000;	// Minimum amount of time between customer actions
let maxTimeout = 5000;

let UserLoad = function() {

    // this.minTimeout = minTimeout;
    // this.maxTimeout = maxTimeout;

    this.init = (purchasingPool, customerServicePool, rotateSetting) => {
        this.purchasingPool = purchasingPool;
        this.customerServicePool = customerServicePool;
        if(rotateSetting) this.rotateSetting = rotateSetting;
    }

    // this.getRandomInt = (minimum, maximum) => {
    //     return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    // }

    this.decideBuy = (difficulty) => this.getRandomInt(0,10)>difficulty;

    this.convertSQLWithCallback = (sql, funcs) => {
        let result = {};
        if(funcs.startCall && funcs.successCall && funcs.errorCall && this.id){
            let {startCall, successCall, errorCall} = funcs;
            let id = this.id;
            let name = this.name;
            result = {query:sql, startCall: startCall(id, name), successCall: successCall(id, name), errorCall: errorCall(id, name)};
            return result;
        }
        else return sql
    }

    this.tryCallBack = (sql, name) => {
        if(this.callBackFuncs && this.callBackFuncs[name]){
            return this.convertSQLWithCallback(sql, this.callBackFuncs[name]);
        }
        else return sql;
    }

    this.login = (id) => {
        if(this.rotateSetting) this.rotateSetting(false)();
        this.id = id;
        let sql = "select * from WEBSTORE.CUSTOMER order by RAND() fetch first 1 rows only";
        sql = this.tryCallBack(sql, "login");
        this.purchasingPool.singleQuery(sql, this.loginCallBack);
    }

    this.loginCallBack = (result) => {
        let user = result[0];
        this.name = user.C_SALUTATION + " " + user.C_LAST_NAME;
        this.user = user;
        let layBack = () => {
            if (this.decideBuy(8)) {
                this.jsonStuff();
            }
            else if (this.decideBuy(7)) {
                this.alterOrder();
            }
            else {
                this.browse();
            }
        }
        this.delayQuery(layBack);
    }

    this.logout = () => {if(this.rotateSetting) this.rotateSetting(true)();}/*setTimeout(() => {
        if(this.callBackFuncs && this.callBackFuncs.endCall)
            this.callBackFuncs.endCall(this.id, this.name)();
    }, 1000);*/

    this.behaviour = (id, callBackFuncs) => {
        this.callBackFuncs = callBackFuncs;
        this.login(id);
    }

    // this.delayQuery = (call) => {
    //     let {getRandomInt, minTimeout, maxTimeout} = this;
    //     let waitTime = getRandomInt(minTimeout, maxTimeout);
    //     setTimeout(call, waitTime);
    // }

    this.browse = () => {
        let {user, getRandomInt} = this;
        let page = getRandomInt(1,3);

        let browseCallBack = (result) => this.delayQuery(() => {
            let rows = result;
            this.buy(rows);
        });

        let execute = () => {
            let sql = "select * from WEBSTORE.INVENTORY where INV_QUANTITY_ON_HAND > 0 order by RAND() fetch first 9 rows only";
            sql = this.tryCallBack(sql, "browse");
            this.purchasingPool.singleQuery(sql, browseCallBack);
        }
        for(let i=0;i<page;i++){
            execute();
        }
    }

    this.buy = (rows) => {
        let {user, getRandomInt} = this;
        let item = rows[getRandomInt(0, rows.length-1)];
        if(item) {
            if (this.decideBuy(6)) {
                let execute = () => {
                    let sql = 'INSERT INTO "WEBSTORE"."WEBSALES" ("WS_CUSTOMER_SK","WS_ITEM_SK","WS_QUANTITY") VALUES(' + user.C_CUSTOMER_SK + ', ' + item.INV_ITEM_SK + ', ' + getRandomInt(1, item.INV_QUANTITY_ON_HAND) + ');';
                    sql = this.tryCallBack(sql, "buy");
                    this.purchasingPool.singleQuery(sql);
                }
                execute();
            }
        }
        this.logout();
    }

    this.alterOrder = () => {
        let {user} = this;
        let alterCallBack = (result) => this.delayQuery(() => {
            let order = result[0];
            if (order&&order.WS_ORDER_NUMBER) {
                if (this.decideBuy(6))
                    this.cancelOrder(order);
                else this.updateOrder(order);
            }
            else this.logout();
        });
        let execute = () => {
            let sql = "select * from WEBSTORE.WEBSALES where WS_CUSTOMER_SK = " + user.C_CUSTOMER_SK + " order by RAND() fetch first 1 rows only";
            sql = this.tryCallBack(sql, "alterorder");
            this.customerServicePool.singleQuery(sql, alterCallBack);
        }
        //this.delayQuery(execute);
        execute();
    }

    this.updateOrder = (order) => {
        let {user, getRandomInt} = this;
        let execute = () => {
            let sql = "UPDATE WEBSTORE.WEBSALES SET WS_QUANTITY = " + getRandomInt(1, 20) + " WHERE WS_CUSTOMER_SK = " + user.C_CUSTOMER_SK + " AND WS_ORDER_NUMBER = " + order.WS_ORDER_NUMBER + " AND WS_ITEM_SK = " + order.WS_ITEM_SK
            sql = this.tryCallBack(sql, "updateorder");
            this.customerServicePool.singleQuery(sql);
        }
        execute();
        this.logout();
    }

    this.cancelOrder = (order) => {
        let {user, getRandomInt} = this;
        let execute = () => {
            let sql = "DELETE FROM WEBSTORE.WEBSALES WHERE WS_CUSTOMER_SK = " + user.C_CUSTOMER_SK + " AND WS_ORDER_NUMBER = " + order.WS_ORDER_NUMBER + " AND WS_ITEM_SK = " + order.WS_ITEM_SK
            sql = this.tryCallBack(sql, "deleteorder");
            this.customerServicePool.singleQuery(sql);
        }
        execute();
        this.logout();
    }

    this.jsonStuff = () => {
        let {user} = this;
        let execute = () => {
            let sql = "INSERT INTO  \"WEBSTORE\".\"TESTJSON\" (\"JSON_FIELD\") VALUES(SYSTOOLS.JSON2BSON('" + JSON.stringify(user) + "'))" // It needs to be converted to a string before put in the sql
            sql = this.tryCallBack(sql, "jsonstuff");
            this.purchasingPool.singleQuery(sql);
            this.logout(this.id);
        }
        execute();
        this.logout();
    }

}

let UserRotate = function() {

    this.stop = () => {this.keepRun = false;this.stoppedNum = 0;}

    this.autoStop = (end) => {this.endTime = end;}

    this.setRotate = (tf) => () => {
        this.endRotate = tf;
        if(!this.keepRun && this.addToStopList){
            this.addToStopList();
        }
    }

    this.start = (id, purchasingPool, customerServicePool, endTime, callBackFuncs, addToStopList) => {
        this.endTime = endTime;
        this.keepRun = true;
        this.endRotate = false;
        this.addToStopList = addToStopList;
        let execute = (cid) => {
            let user = new UserLoad();
            user.init(purchasingPool, customerServicePool, this.setRotate);
            user.behaviour(cid, callBackFuncs);
        }
        if(callBackFuncs && callBackFuncs.startCall) callBackFuncs.startCall();

        let i = 0;
        async.whilst(
            () => {
                if((this.endTime && Date.parse(new Date())<parseInt(this.endTime)) || !this.keepRun) return false;
                else return true;
            },
            (next) => {
                if((this.endTime && Date.parse(new Date())<parseInt(this.endTime)) || !this.keepRun) return;
                else
                    this.delayQuery(()=>{execute(id+"user"+(i++)); next();});
            },
            (err)=>{
                console.log(id+"users stopped.");
                //if(callBackFuncs && callBackFuncs.endCall) callBackFuncs.endCall();
            }
        )
    }

    this.stopCallBck = () => {}

}

UserLoad.prototype.setMaxTimeout = UserRotate.prototype.setMaxTimeout = (time) => {
    maxTimeout = time;
}

UserLoad.prototype.setMinTimeout = UserRotate.prototype.setMinTimeout = (time) => {
    minTimeout = time;
}

UserLoad.prototype.getRandomInt = UserRotate.prototype.getRandomInt = (minimum, maximum) => {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

UserLoad.prototype.minTimeout = UserRotate.prototype.minTimeout = minTimeout;

UserLoad.prototype.maxTimeout = UserRotate.prototype.maxTimeout = maxTimeout;

UserLoad.prototype.delayQuery = UserRotate.prototype.delayQuery = function(call) {
    let {getRandomInt} = this;
    let waitTime = getRandomInt(minTimeout, maxTimeout);
    setTimeout(call, waitTime);
}

module.exports.userLoad = UserLoad;
module.exports.userRotate = UserRotate;