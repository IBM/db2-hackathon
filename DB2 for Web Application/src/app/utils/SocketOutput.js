
let Output = function (Socket, Cmd, Uid) {

    this.generateResult = (id, username, connNum, queryNum, state) => {
        let result = {userid: id, connNum, queryNum, state, username};
        result.timestamp = Date.parse(new Date()).toString().substr(0,10);
        //this.resultList.push(result);
        //let qrResult = this.formatMetric();
        //result.qrPS = qrResult;
        return result;
    }

    this.formatMetric = () => {
        let lastOne = this.resultList[this.resultList.length-1];
        let qrPS = 0;
        this.resultList = this.resultList.filter((item)=>{
            if(parseInt(item.timestamp)<parseInt(lastOne.timestamp)-1) return false;
            qrPS += parseInt(item.queryNum);
            return true;
        });
        return qrPS;
    }

    this.generateCallback = (state) => (id, username) => (connNum, queryNum) => {
        let result = this.generateResult(id, username, connNum, queryNum, state);
        //Socket.to(Uid).emit(Cmd, JSON.stringify(result));
        this.addToResultList(result);
    }

    this.addToResultList = (result) => {
        if( this.resultList.length>0 && this.resultList[0].timestamp == result.timestamp){
            this.resultList.push(result);
        }
        else{
            let outputResult = this.resultList;
            this.resultList = [result];
            let output = this.generateOutput(outputResult);
            Socket.to(Uid).emit(Cmd, JSON.stringify(output));
        }
    }

    this.generateOutput = (output) => {
        let qrPS = 0;
        let qrDs = {}, outputArray = {};
        let purConnNum = 0; let custConnNum = 0;
        let timestamp = output[0]?output[0].timestamp:"";
        output.forEach((result) => {
            if(result.state.split('-').length<=2){
                if(result.connNum > purConnNum) purConnNum = result.connNum;
            }
            else{
                if(result.connNum > custConnNum) custConnNum = result.connNum;
            }
            qrPS += result.queryNum;
            let key = result.state.trim();
            if(!qrDs[key]) qrDs[key] = 0;
            qrDs[key] = qrDs[key] + 1;
        });
        let queryNum = this.generateUserQrNum(outputArray, qrDs);
        return {queryNum, purConnNum, custConnNum, qrPS, outputArray};
    }

    this.generateUserQrNum = (outputArray, stateNum) => {
        let qr = 0;
        for(let key in userLoadSocketOutput){
            outputArray[key] = [];
            let states = userLoadSocketOutput[key];
            states.map((item, i) => {
                let value = stateNum[item.trim()]||0;
                outputArray[key].push(value);
                if(i==1) qr += value;
            });
        }
        return qr;
    }

    this.startupCall = () => {
        Socket.to(Uid).emit(Cmd, JSON.stringify({data:userLoadSocketOutput}));
    }

    this.endCall = () => {
        let output = this.generateOutput([]);
        output.end = true;
        Socket.to(Uid).emit(Cmd, JSON.stringify(output));
    }

    this.generateCallbackFuncs = (stateList) => {
        let funcs = {};
        funcs.startCall = this.generateCallback(stateList[0]);
        funcs.successCall = this.generateCallback(stateList[1]);
        funcs.errorCall = this.generateCallback(stateList[2]);
        return funcs;
    }

    this.generateFucs4User = () => {
        let result = {};
        for(let key in userLoadSocketOutput){
            result[key] = this.generateCallbackFuncs(userLoadSocketOutput[key]);
        }
        result.startCall = this.startupCall;
        result.endCall = this.endCall;
        this.resultList = [];
        return result;
    }

    let userLoadSocketOutput = {
        login:["login(select)-start", "login(select)-success", "login(select)-error"],
        browse:["browse(select)-process", "browse(select)-success", "browse(select)-error"],
        buy:["buy(insert)-process", "buy(insert)-success", "buy(insert)-error"],
        alterorder:["alter order(select)-process-2", "alter order(select)-success-2", "alter order(select)-error-2"],
        updateorder:["update order(update)-process-2", "update order(update)-success-2", "update order(update)-error-2"],
        deleteorder:["delete order(delete)-process-2", "delete order(delete)-success-2", "delete order(delete)-error-2"],
        jsonstuff:["json func(insert)-process", "json func(insert)-success", "json func(insert)-error"]
    }

}

module.exports.output = Output;