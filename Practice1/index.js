//npm init / npm install express / npm install ejs / npm install express-validator->to start off -> this will 
//install dependencies and add them in package.json or do below for adding dependenices in package.json first and
//then say npm install
//added ejs,body-parser,express-validator,mongoose dependencies under package.json
//npm install->updates existing packages with all the newly added packages
//npm install nodemon --save-dev ->this will restart the sever after any changes to index.js and add watch 
//in package.json and run npm run watch
//import dependencies
const express = require('express');
const path = require('path');
const { check, validationResult } = require('express-validator'); //both are fns under express-validator.
//its a ES6 standard for destructuring a object. destructing object ->look video of week10 learning
const mongoose = require('mongoose');//setup db connection
mongoose.connect('mongodb://localhost:27017/practise',{
    useNewUrlParser:true,
    useUnifiedTopology:true
});// to override the older versions
const session=require('express-session');//session
//setup model for orders
const Order=mongoose.model('Order',{
    name: String,
    email: String,
    phone: String,
    postcode: String,
    lunch: String,
    tickets: Number,
    campus: String,
    subTotal: Number,
    tax: Number,
    total: Number
});
//model for admins
const Admin=mongoose.model('Admin',{
username:String,
password:String
});
// const bodyParser = require('body-parser');//deprecated for Express v4.16.0 and higher, so removed from 
//package.json also
//set up global variables
var myApp = express();
//extended:true->to use qs library. This supports rich objects like nesting and arrays
//extended:false->to use querystring library. This not supports rich objects like nesting and arrays
myApp.use(express.urlencoded({ extended: false }));
myApp.use(session({
    secret:'RavaliChilucoti',//produce hashes to save session cookies
    resave:false,//not saves expired sessions
    saveUninitialized:true//saves the activities of anonynmous users
}));//setup session
//set path to public and view folders->used to deploy them in server
myApp.set('views', path.join(__dirname, 'myViews'));
myApp.use(express.static(__dirname + '/public'));//holds all front end code
//defining view engine to be used->helps compile all the html content send to client and 
//also helps to process dynamic content
myApp.set('view engine', 'ejs');
//set up routes(pages)
//home page
myApp.get('/', function (req, res) {
    //no need to add .ejs to filename as already set in viewengine
    res.render('form');
});

//defining regular expressions
var phoneRegex = /^[0-9]{3}\-[0-9]{3}\-[0-9]{4}$/;
var positiveNum = /^[1-9][0-9]*$/;

//function to check a value using regular expression
function checkRegex(userInput, regex){
    if(regex.test(userInput)){
        return true;
    }
    else{
        return false;
    }
}
// Custom phone validation function
function customPhoneValidation(value){
    if(!checkRegex(value, phoneRegex)){
        throw new Error('Phone should be in the format xxx-xxx-xxxx');
    }
    return true;
}
// Valiation rules for tickets and lunch:
// 1. Tickets should be a number
// 2. User has to buy lunch if they buy less than 3 tickets
function customLunchAndTicketsValidation(value, {req}){
    var tickets = req.body.tickets;
    if(!checkRegex(tickets, positiveNum)){
        throw new Error('Please select tickets. Tickets should be a number');
    }
    else{
        tickets = parseInt(tickets);
        if(tickets < 3 && value != 'yes'){
            throw new Error('Lunch is required if you buy less than 3 tickets');
        }
    }
    return true;
}

myApp.post('/', [
    check('name', 'Name is required').notEmpty(), //.not().isEmpty()->negates immediate fn. both are similar.
    check('email', 'Email is required').isEmail(),//1st param is property should match the name attribute value in form ejs file
    check('phone').custom(customPhoneValidation),
    check('lunch').custom(customLunchAndTicketsValidation)
], function (req, res) {
    //get validationResult from above validations
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('form', { errors: errors.array() })
    }
    else {
        //req is a object which contains body object which contains all the form elements that are submitted
        var name = req.body.name;//this property should match the name attribute value in form ejs file
        var email = req.body.email;
        var phone = req.body.phone;
        var postcode = req.body.postcode;
        var lunch = req.body.lunch;
        var tickets = req.body.tickets;
        var campus = req.body.campus;

        var subTotal = tickets * 20;
        if (lunch == 'yes') {
            subTotal += 15;
        }
        var tax = subTotal * 0.13;
        var total = subTotal + tax;

        //creating an object to send data to form ejs page to build the receipt
        var pageData = {
            name: name,
            email: email,
            phone: phone,
            postcode: postcode,
            lunch: lunch,
            tickets: tickets,
            campus: campus,
            subTotal: subTotal,
            tax: tax,
            total: total
        }

        //store to db
        var newOrder=new Order(pageData);
        newOrder.save().then(function(){//save and call back after save(any fn after save)
            console.log('order created');
        });
        res.render('form', pageData);//form.ejs page. no need of extension here. can use different page to show output
    }
});

//all orders page
myApp.get('/allorders',function (req, res) {
    if(req.session.userLoggedIn){
    Order.find({}).exec(function(err,orders){
        res.render('allorders',{orders:orders});
    });
}
else{
    res.redirect('/login');
}
});
//login page
myApp.get('/login',function (req, res) {
        res.render('login');
});
//login post
myApp.post('/login',function(req,res){
    var user=req.body.username;
    var pass=req.body.password;

    Admin.findOne({username:user,password:pass}).exec(function(err,admin){
        if(admin){//no match, no admin
            req.session.username=admin.username;
            req.session.userLoggedIn=true;
            res.redirect('/allorders');
        }
      else{
          res.render('login',{error:'cannot login'});
      }
    });
});
//logout page
myApp.get('/logout', function (req, res) {
req.session.username='';
req.session.userLoggedIn=false;
res.render('login',{error:'logged out'}); //using the error variable for msg dislay
});
//delete page
myApp.get('/delete/:orderid',function (req, res) {//orderid is variable
    if(req.session.userLoggedIn){
        var oid=req.params.orderid;
        Order.findByIdAndDelete({_id:oid}).exec(function(err,order){
            if(order){
                res.render('delete',{message:'deleted'});
            }
            else{
                res.render('delete',{message:'not deleted'});
            }
        });
    }
    else
    {
        res.redirect('/login');
    }
});
//edit page
myApp.get('/edit/:orderid',function (req, res) {//orderid is variable
    if(req.session.userLoggedIn){
        var oid=req.params.orderid;
        Order.findOne({_id:oid}).exec(function(err,order){
            if(order){
                res.render('edit',{order:order});
            }
            else{
                res.send('no order found with that id..');
            }
        });
    }
    else
    {
        res.redirect('/login');
    }
});
//edit post
myApp.post('/edit/:orderid', [
    check('name', 'Name is required').notEmpty(), //.not().isEmpty()->negates immediate fn. both are similar.
    check('email', 'Email is required').isEmail(),//1st param is property should match the name attribute value in form ejs file
    check('phone').custom(customPhoneValidation),
    check('lunch').custom(customLunchAndTicketsValidation)
], function (req, res) {
    //get validationResult from above validations
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        var id=req.params.orderid;
        Order.findOne({_id:id}).exec(function(err,order){
            if(order){
                res.render('edit',{order:order,errors:errors.array()});
            }
            else{
                res.send('no order found with that id..');
            }
        });
        //res.render('edit', { errors: errors.array() })//fetch and pass order from db otherwise it will not work
    }
    else {
        //req is a object which contains body object which contains all the form elements that are submitted
        var name = req.body.name;//this property should match the name attribute value in form ejs file
        var email = req.body.email;
        var phone = req.body.phone;
        var postcode = req.body.postcode;
        var lunch = req.body.lunch;
        var tickets = req.body.tickets;
        var campus = req.body.campus;

        var subTotal = tickets * 20;
        if (lunch == 'yes') {
            subTotal += 15;
        }
        var tax = subTotal * 0.13;
        var total = subTotal + tax;

        //creating an object to send data to form ejs page to build the receipt
        var pageData = {
            name: name,
            email: email,
            phone: phone,
            postcode: postcode,
            lunch: lunch,
            tickets: tickets,
            campus: campus,
            subTotal: subTotal,
            tax: tax,
            total: total
        }

       var id=req.params.orderid;
       Order.findOne({_id:id},function(err,order){
           order.name=name;
            order.email= email;
            order.phone= phone;
            order.postcode= postcode;
            order.lunch= lunch;
            order.tickets= tickets;
            order.campus= campus;
            order.subTotal= subTotal;
            order.tax= tax;
            order.total= total;
            order.save();
       });
        res.render('editSuccess', pageData);
    }
});

//author page
myApp.get('/author', function (req, res) {
    res.render('author', {
        name: 'Ravali',
        studentNumber: '324'
    });
});
//start server and listen at port
myApp.listen(8080);
console.log('done');