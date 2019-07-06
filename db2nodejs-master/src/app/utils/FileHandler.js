'use strict';
const fs=require('fs');
const path = require('path');

let user_cred = function() {

    let folder = path.join(__dirname, "../config");
    this.fileList = {
        db2Cred: "../config/db2cred.json",
        userCred: "../config/user.json"
    }

    fs.mkdir(folder, function(err){
        if(err) return;
        console.log("create config folder");
        fs.exists(folder, function(exists){
            console.log("already exists config folder");
        })
    });

    this.readJSONFile = (file) => {
        file = path.join(__dirname, file);
        let result;
        try{
            result = fs.readFileSync(file);
            result = JSON.parse(result);
        }
        catch(error){
            result = {};
            fs.writeFile(file,JSON.stringify({}),function(err){
                if(err) throw err
                console.log("success");
            });
        }
        return result;
    }

    this.writeJSONFile = (file, obj) => {
        file = path.join(__dirname, file);
        try{
            fs.writeFileSync(file, JSON.stringify(obj));
        }
        catch(error){
            fs.writeFile(file,JSON.stringify(obj),function(err){
                if(err) throw err
                console.log("success");
            });
        }
    }

    this.writeUser = (user) => {
        this.writeJSONFile(this.fileList.userCred, user);
    }

    this.readUser = () => this.readJSONFile(this.fileList.userCred);

    this.writeDb2Cred = (cred) => {
        this.writeJSONFile(this.fileList.db2Cred, cred);
    }

    this.readDb2User = () => this.readJSONFile(this.fileList.db2Cred);

    this.write = this.writeDb2Cred;
    this.read = this.readDb2User;

}

module.exports.users = user_cred;