function LoadData(msgContainer){
    this.load = function(params){
        var user = location.pathname;
        var progress = $('#progressBar')[0];
        var progressdiv = $('#progressBar div')[0];
        progress.style.display="block";
        progressdiv.style.backgroundColor = 'transparent';
        var that = this;
        $.ajax({
            type: 'get',
            url: user+'/upload',
            data: params,
            dataType: 'json',
            success: function (data) {
                progressdiv.style.backgroundColor = '#007bff';
                that.popup(data);
                return ;
            },
            error: function (err) {
                progressdiv.style.backgroundColor = '#dc3545';
                $('#progressBar div span')[0].style.backgroundColor = "#dc3545";
                that.popup(err);
                return ;
            }
        });
    }
    this.popup = function(data){
        var that = this;
        var params = {
            severity: "error",
            title:"TIMEOUT!",
            body:"Cannot connect to express server.",
            okHandler:that.hideDialog
        }
        if(data.severity){
            params = data;
            params.okHandler = that.hideDialog;
            that.showDialog(params);
        }
        else{
            that.showDialog(params);
        }
    }
    this.showDialog = function(params){
        var dialog = $('#popupDialog')[0];
        var main = $('.main')[0];
        if(params.severity){
            switch(params.severity){
                case 'success': {dialog.className="alert alert-success topWarn"; break;}
                case 'error': {dialog.className="alert alert-danger topWarn"; break;}
                case 'warn': {dialog.className="alert alert-warning topWarn"; break;}
                default: {dialog.className="alert alert-info topWarn"; break;}
            }
        }
        var btn = dialog.querySelector('#okBtn');
        btn.style.display = "none";
        if(params.okHandler){
            btn.style.display = "inline-block";
            btn.onclick = params.okHandler;
        }
        btn = dialog.querySelector('#cancelBtn');
        btn.style.display = "none";
        if(params.cancelHandler){
            btn.style.display = "inline-block";
            btn.onclick = params.cancelHandler;
        }
        if(params.title){
            dialog.querySelector('strong').innerHTML = params.title;
        }
        if(params.body){
            dialog.querySelector('span').innerHTML = params.body;
        }
        dialog.style.top = "76px";
        main.className = "main blur";
    }
    this.hideDialog = function(){
        var dialog = $('#popupDialog')[0];
        var main = $('.main')[0];
        dialog.style.top = "-10px";
        main.className = "main";
        $('#progressBar')[0].style.display = "none";
    }
}

function startPool(container){

    var bgColor = ["alert-success", "alert-info", "alert-warning", "alert-danger"];

    this.container = container;

    this.historyMax = 1;

    this.init = function(size1, size2, label1, label2){
        var that = this;
        this.historyMax = 0;
        that.container.innerHTML = "";
        var content = that.generateTopBanner()
            +that.getDashboard(label1+" connection number:", size1)
            +that.getDashboard(label2+" connection number:", size2)
            +that.generateMetric()
            +that.createPool(label1, 0)
            +that.createPool(label2, 1);
        that.container.innerHTML = content;
        that.startTime = Date.parse(new Date()).toString().substr(0,10);
        this.speed = {};
    }

    this.generateTopBanner = function(){
        var date = new Date();
        var format = function(num){
            return num<10?'0'+num:num;
        }
        var hour = format(date.getHours());
        var minute = format(date.getMinutes());
        var second = format(date.getSeconds());
        var title = "<h4 class='startTime'>Application start - "+hour+":"+minute+":"+second+"</h4>";
        return title;
    }

    this.Title = function(){
        var Title = "<h2>hello</h2>";
        return Title;
    }
    this.generateMetric = function() {
        var content = "<div ><span style=\"width:50%;display:inline-block\">Queries per Second:</span><span id='queryPSec'></span></div><div><span style=\"width:50%;display:inline-block\">Total queries:</span><span id='totalQr'>0</span></div>";
        return content;
    }

    this.initUserMetrics = function(data, purPane, custPane) {
        var purPoolContent = "";
        var custPoolContent = "";
        for(var key in data){
            var containerPre = '<div id="'+key+'Container" class="queryContainer"><span class="queryLabel">'+data[key][0].split('-')[0]+'</span><span class="queryBarContainer">';
            var containerEd = '<span id="'+key+'TotalNum" class="queryNum">0</span></span></div>';
            var content = "";
            var pur = true;
            if(data[key][0].split('-').length>2) pur = false;
            for(var i = 0; i < data[key].length;i++){
                content += '<span id="'+key+i+'Bar" class="queryBar'+i+'"></span>';
            }
            if(pur) purPoolContent += containerPre + content + containerEd;
            else custPoolContent += containerPre + content + containerEd;
        }
        purPane.innerHTML = purPoolContent;
        custPane.innerHTML = custPoolContent;
    }

    this.refreshUserMetrics = function(data) {
        if(data.purConnNum !== undefined && data.custConnNum !== undefined) this.setDash(parseInt(data.purConnNum), parseInt(data.custConnNum));
        if(data.qrPS !== undefined && data.queryNum !== undefined) this.setMetric(parseInt(data.qrPS), parseInt(data.queryNum));
        if(this.historyMax == 0) this.historyMax = data.qrPS;
        if(data.outputArray){
            for(var key in data.outputArray){
                this.refreshBar(key, data.outputArray[key]);
            }
        }
    }

    this.refreshBar = function(id, data) {
        let total = 0;
        for(var i = 0; i < data.length; i++){
            total+=data[i];
        }
        if(total>this.historyMax) this.historyMax = total;
        for(var i = 0; i < data.length; i++){
            var ele = data[i];
            var len = (ele*100)/this.historyMax;
            var key = '#' + id + i + 'Bar';
            $(key).css("width", len);
            $(key).html(ele==0?"":ele);
            if(ele>0){
                var minWid = (ele+"").length *14 + "px";
                $(key).css("min-width", minWid);
            }else $(key).css("min-width", "0px");
        }
        document.getElementById(id+"TotalNum").innerHTML = total;
    }

    this.setWidth4Bar = function(key, data){
        var total = 0;
        data.forEach(function(item){total+=item});
    }

    this.getDashboard = function(title, size){
        var label = "<span class='poolDash'>"+title+"</span>";
        var boxes = "";
        for(var i = 0;i<size;i++){
            boxes += "<span class='size blank'></span>";
        };
        return "<div class='poolLabelDash'>"+label+boxes+"</div>";
    }

    this.createPool = function(title, i){
        var header = '<h5 class="poolTitle">'+title+'</h5>';
        var body = '<div id="pool'+i+'" class="alert '+bgColor[i%4]+'">'+header+'</div>';
        return body;
    }

    this.setDash = function(size1, size2){
        var panel1 = $('.poolLabelDash')[0];
        var panel2 = $('.poolLabelDash')[1];
        var loop = function(panel, size) {
            var spans = panel.querySelectorAll('.size');
            for (var i = 0; i < spans.length; i++) {
                if (i < size) spans[i].className = 'size block';
                else spans[i].className = 'size blank';
            }
        }
        if(size1!==undefined) loop(panel1, size1);
        if(size2!==undefined) loop(panel2, size2);
    }

    this.setMetric = function(qPS, delTa, timestamp){
        var qpsC = $('#queryPSec')[0];
        var totalQ = $('#totalQr')[0];
        totalQ.innerHTML = parseInt(totalQ.innerHTML) + delTa;
        if(timestamp){
            if(!this.speed || !this.speed[timestamp]){
                qpsC.innerHTML = qPS;
                if(!this.speed) this.speed = {};
                this.speed[timestamp] = qPS;
            }
            else if(qPS > this.speed[timestamp]){
                qpsC.innerHTML = qPS;
                this.speed[timestamp] = qPS;
            }
        }
        else qpsC.innerHTML = qPS;
    }

    this.userSignIn = function(pane, user){
        var userContainer = '<div><button style="margin-left:0%" id="'+user.userid+'" type="button" class="btn btn-info mockUser">Logging...</button></div>';
        pane.innerHTML = pane.innerHTML + userContainer;
    }

    this.transfer = function(pane1, pane2, userid){
        var user = $('#'+userid)[0];
        if(user&&user.parentNode)
            pane2.appendChild(user.parentNode);
    }

    this.moveUser = function(pane, userid, left, success, label){
        var user = $('#'+userid)[0];
        if(user) {
            user.innerHTML = label;
            if (success == -1) user.className = "btn btn-danger mockUser";
            else if (success == 0) user.className = "btn btn-info mockUser";
            else if (success == 1) user.className = "btn btn-success mockUser";
            user.style.marginLeft = parseInt(user.style.marginLeft) + left + '%';
        }
    }

    this.userSignOut = function(pane1, pane2, userid){
        var user = $('#'+userid)[0];
        if(user&&user.parentNode) user.parentNode.parentNode.removeChild(user.parentNode);
    }

}