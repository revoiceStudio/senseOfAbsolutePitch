"use strict"
const scribble = require('scribbletune');
const audioconcat = require('audioconcat')
const express = require('express')
const fs = require('fs')
const exec = require('child_process').exec;
require('json-dotenv')('.config.json')
require('dotenv').config({path:'credentials.env'})
const app = express()
app.use(express.json())


app.use('/SenseOfAbsolutePitch/DoReMiFaSoLaTiDo', async function(req, res, next){
    const parameters = req.body.action.parameters
    const responseObj = JSON.parse(process.env.response)
    const directives = responseObj.directives[0]
    let array = []
    console.log("actionName : ", req.body.action.actionName)
    console.log("parameters : ",parameters)
    if(Object.keys(parameters).length === 0){
        console.log("parameters is empty")
    }else{
        if(parameters["DoReMiFaSoLaTiDo"] !== undefined ){
            const DoReMiFaSoLaTiDo = parameters["DoReMiFaSoLaTiDo"].value.replace(/ /gi, "")
            for(var i=0; i < DoReMiFaSoLaTiDo.length; i++){
                array.push( convertWord( DoReMiFaSoLaTiDo.substring(i,i+1) ) )
                console.log("array : ", array)
            }
            
            await joinMp3(array)
            directives.audioItem.stream["url"] = process.env.SOUND_PATH + "all.mp3"
        }        
    }
    console.log(responseObj)
    return res.json(responseObj)
})

let saveAnswer
app.use('/SenseOfAbsolutePitch/SensOfAbsolutePitchQuiz', async function(req, res, next){
    const responseObj = JSON.parse(process.env.response)
    const directives = responseObj.directives[0]
    console.log("actionName : ", req.body.action.actionName)
    const randomNum = generateRandom(1, 7)
    directives.audioItem.stream["url"] = process.env.SOUND_PATH + "sound"+randomNum +".mp3"    
    directives.audioItem.stream["token"] = "quiz_finish"
    saveAnswer = randomNum
    console.log(responseObj)
    return res.json(responseObj)
})
app.use('/SenseOfAbsolutePitch/SenseOfAbsolutePitchQuiz_answer', async function(req, res, next){
    const parameters = req.body.action.parameters
    const responseObj = JSON.parse(process.env.response)
    const directives = responseObj.directives[0]
    console.log("actionName : ", req.body.action.actionName)
    console.log("parameters : ",parameters)
    if(Object.keys(parameters).length === 0){
        console.log("parameters is empty")
    }else{
        if(parameters["answer"] !== undefined ){
            let answer = parameters["answer"].value
            if(saveAnswer==1){
                saveAnswer = "도"
            }
            if(saveAnswer==2){
                saveAnswer = "레"
            }
            if(saveAnswer==3){
                saveAnswer = "미"
            }
            if(saveAnswer==4){
                saveAnswer = "파"
            }
            if(saveAnswer==5){
                saveAnswer = "솔"
            }
            if(saveAnswer==6){
                saveAnswer = "라"
            }
            if(saveAnswer==7){
                saveAnswer = "시"
            }
            // answer check
            if(answer==saveAnswer){
                responseObj.output["ment"] = "정답입니다."
            }else{
                responseObj.output["ment"] = "이런 틀렸어요. 정답은 "+ saveAnswer + " 입니다."
            }
            const randomNum = generateRandom(1, 7)
            directives.audioItem.stream["url"] = process.env.SOUND_PATH + "sound"+randomNum +".mp3"
            directives.audioItem.stream["token"] = "quiz_finish"
            saveAnswer = randomNum
        }        
    }
    console.log(responseObj)
    return res.json(responseObj)
})

app.listen(process.env.PORT, () => {
    console.log('beat app listening on port '+ process.env.PORT)
})
function generateRandom(min, max) {
    var ranNum = Math.floor(Math.random()*(max-min+1)) + min;
    return ranNum;
  }
function convertWord(value){
    if(value=="도"){
        value = "./sound/sound1.mp3"
    }
    if(value=="레"){
        value = "./sound/sound2.mp3"
    }
    if(value=="미"){
        value = "./sound/sound3.mp3"
    }
    if(value=="파"){
        value = "./sound/sound4.mp3"
    }
    if(value=="솔"){
        value = "./sound/sound5.mp3"
    }
    if(value=="라"){
        value = "./sound/sound6.mp3"
    }
    if(value=="시"){
        value = "./sound/sound7.mp3"
    }
    return value
}
function joinMp3(array){
    return new Promise((resolve, reject)=>{
        audioconcat(array)
        .concat('./sound/all.mp3')
        .on('start', function (command) {
            console.log('ffmpeg process started:', command)
        })
        .on('error', function (err, stdout, stderr) {
            console.error('Error:', err)
            console.error('ffmpeg stderr:', stderr)
            resolve(err)
        })
        .on('end', function (output) {
            console.error('Audio created in:', output)
            resolve(output)
        })
    })    
}

function makeMidiFile(user_id, Arr){
    let notes = []
    let clip
    for(var i=0; i<Arr.length; i++){
        switch(Arr[i]){
            // 4 by 4 kick 
            case "킥":
                notes.push('c2')                              
                break  
            //hat       
            case "햇":
                notes.push('c4')                             
                break
            // A simple bass line     
            case "베이스":
                notes.push(scribble.scale('a2 minor').slice(0,1))        
                notes.push(scribble.scale('a2 minor').slice(1,2))  
                notes.push(scribble.scale('a2 minor').slice(2,3))           
                break
            default:
                clip = scribble.clip({
                    notes: ['c4']
                })
        }
        if(i==Arr.length-1){
            clip = scribble.clip({
                notes: notes,
                pattern: 'xxxx'.repeat(8)
            })
        } 
    }    
    scribble.midi(clip, "./sound/"+user_id +'.mid')
}
function convertMidiToMp3(user_id){
    exec("timidity -Ow -o - ./sound/"+ user_id +".mid | lame - ./sound/" + user_id +"_output.mp3", function (err, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (err !== null) {
            console.log('error: ' + err);
        }
    });
}

function mergeMp3(user_id, input, output_name){
    return new Promise( (resolve, reject)=>{
        let inputs = ""
        for(var i=0; i<input.length; i++){
            inputs += " -i ./sound/"+ input[i]
        }  
        exec("ffmpeg "+ inputs +" -filter_complex amix=inputs="+input.length+":duration=first:dropout_transition=0 ./sound/"+ output_name+".mp3", function (err, stdout, stderr) {
            console.log('stderr: ' + stderr);
            if (err !== null) {
                console.log('error: ' + err);
            }
            resolve(stdout)
        });
    })
    
}
function setOutputfileName(user_id, output_name){
    for(var i=1; i<100; i++){
        try {
            //file exists
            if(fs.existsSync('./sound/'+user_id+'_merge_'+i+'.mp3')) {                
                //nothing     
            }
            else{
                output_name = user_id +'_merge_'+i                
                console.log("output_name : ",output_name)
                break;
            }
        } catch(err) {
            console.log(err)
            break;
        }
    }
    return output_name            
}
