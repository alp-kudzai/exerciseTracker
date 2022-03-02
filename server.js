const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()

const mySecret = process.env.MONGO_URL
// console.log(mySecret)
// console.log(process.env)
//connect mongoose
mongoose.connect(mySecret, {useNewUrlParser: true})

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
//Log schema, it is a subdocument
// const LogSchema = new mongoose.Schema({
//   description: {type: String, default: 'description'},
//   duration: {type: Number, default: 0},
//   date: {type: Date, default: null}
// })
//Create a Person Schema
const PersonSchema = new mongoose.Schema({
  username: {type: String, required: true},
  count: {type: Number, default: 0},
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
})

//Create a Model
const Person = mongoose.model('People', PersonSchema)

//functions to do stuff to models ;)
//create a new user given username
const createUser = async (user) => {
  let newUser = await Person.create({username: user})
  return newUser.save()
}
//update the users log given descrip. dura. & date [OPTIONAL]
const updateLogs = async (id,descrip, dura, dat, done) => {
  let fDat;
  if (!descrip) descrip = ''
  if (!dura) dura = 0
  if(!dat) {
    dat = new Date
    fDat = dat.toDateString()
  }else{ 
    dat = new Date(dat)
    fDat = dat.toDateString() //here!!!
  }
  let user = await Person.findById(id)
  if (user == null) throw Error('User Does Not Exist!')
  user.log.push({
    description: descrip,
    duration: dura,
    date: fDat
  })
  user.count += 1
  let saved = await user.save()
  //console.log(saved.log)
  
}

//find by id
const findById = (id, done) => {
  Person.find({'_id': id}, (err, data)=>{
    err ? done(err) : done(null, data)
  })
}

//function that gets users logs from given dates
const findUserLogs = async (id, from=null, to=null, limit=null) => {
  let user = await Person.findById(id)
  //console.log(user)
  if (user == null) throw Error('User Does Not Exist!')
  if (from){
    if(from && !to){
      let logs = user.log.filter(log => new Date(log.date).getTime() >= new Date(from).getTime()).map(log => {
        return {
          'description': log.description,
          'duration': log.duration,
          'date': new Date(log.date).toDateString()
        }
      })
      return {
        '_id': user.id,
        'username': user.username,
        'count': user.count,
        'log': logs
      }
    } else{
      let logs = user.log.filter(log => new Date(log.date).getTime() >= new Date(from).getTime() && new Date(log.date).getTime() <= new Date(to).getTime()).map(log => {
        return {
          'description': log.description,
          'duration': log.duration,
          'date': new Date(log.date).toDateString()
        }
      })
      if (limit && limit > 0 && limit < logs.length){
        console.log('limit')
        logs = logs.slice(0,limit)
      }
      return {
        '_id': user.id,
        'username': user.username,
        'count': user.count,
        'log': logs
      }
    }
  }
  else if (!from && !to && limit){
    let logs = user.log.map(log => {
      return {
        'description': log.description,
        'duration': log.duration,
        'date': new Date(log.date).toDateString()
      }
    })
    if (limit && limit > 0 && limit < logs.length){
      console.log('limit but no from')
      logs = logs.slice(0,limit)
    }
    return {
      '_id': user.id,
      'username': user.username,
      'count': user.count,
      'log': logs
    }
  }
  else {
    let logs = user.log.map(log => {
      return {
        description: log.description,
        duration: log.duration,
        date: new Date(log.date).toDateString()
      }
    })
    //console.log(logs)
    return { 
      '_id': user.id,
      'username': user.username,
      'count': user.count,
      'log': logs
    }
  }
}

//ROUTES
//creating a new user
app.post('/api/users', async (req, res, done)=> {
  let user = req.body.username
  console.log('Creating a new user!')
  //console.log(user)
  try{
    let newUser = await createUser(user)
    res.json({
      'username': newUser.username,
      '_id': newUser._id
    })
  } catch(err)
  {done(err)}
})
//viewing all users using /api/users
app.get('/api/users', (req, res) => {
  //find all people in database
  console.log(`GET /api/users from ${req.ip}`)
  Person.find({}, {username: 1}, (err, data)=>{
    err ? res.json({'error': err}) : res.json(data)
  })
})

//posting exercises into logs with /api/:_id/exercises
app.post('/api/users/:_id/exercises', async (req, res, done)=>{
  try{
    let id = req.body[':_id'], descrip = req.body.description, dura = req.body.duration, dat = req.body.date
    //console.log(req.body)
    console.log(req.body[':_id'])
    console.log(`POST /api/users/${id}/exercises from ${req.ip}`)
    if (!id) {
      id = req.params._id
    }
    console.log(`Got id from url: ${id}`)
    console.log(`User ID: ${id}`)
    await updateLogs(id, descrip, dura, dat)
    let user = await Person.findById(id)
    //console.log(user.logs)
    let output = {
      'username': user.username,
      'description': user.log[user.log.length-1].description,
      'duration': user.log[user.log.length-1].duration,
      'date': new Date(user.log[user.log.length-1].date).toDateString(),
      '_id': user._id
    }
    res.json(output)
    
  }catch(err){
    done(err)
  }
  
})

//test
app.get('/api/test?', (req, res)=>{
  let x = req.query.x
  let z = req.query.z
  
  console.log(x)
  console.log(z)
  if (x) res.json({'test': x, 'z': z})
  else res.json({'test': 'no x'})
})

//view user logs with api/users/:_id/logs?:from&:to&:limit
app.get('/api/users/:id/logs?', async (req, res, done) =>{
  let from = req.query.from, to = req.query.to, limit = req.query.limit
  let id = req.params.id
  console.log(`from: ${from} & to: ${to} & limit: ${limit}`)
  console.log(`GET /api/users/${id}/logs from ${req.ip}`)
  let results = await findUserLogs(id, from, to, limit)
  res.json(results)
  })




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
