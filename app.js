var express = require("express");
var app = express();
var sql = require("./js/db.js");
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');
var MySQLStore = require('express-mysql-session')(session);
var mysql = require('mysql');
var url = require('url');
var LocalStrategy = require('passport-local').Strategy;

var urlencodedParser = bodyParser.urlencoded({ extended: false })
var sessionStore = new MySQLStore(sql);

app.use("/css", express.static("./css"));
app.use("/js", express.static("./js"));
app.use("/img", express.static("./img"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: "al1896yb143m5v1k145ganqmw189b123b",
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: true }
}))

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    function (username, password, done) {
        sql.query('SELECT UserID, Password,IsTeacher FROM account WHERE UserID = ?', [username], function (err, results, fields) {
            if (err) { done(err) };

            if (results.length === 0) {
                done(null, false);
            } else{

                if (password.localeCompare(results[0].Password.toString()) === 0) {
                    console.log(results)
                    return done(null, { user_id: results[0].UserID, tutor: results[0].IsTeacher});
                } else {
                    return done(null, false);
                }
            }
        });
    }
));

//API section
//---------------------------------------------------------------------------------------


app.get("/allAccounts", (req, res) => {
    const qstring = "SELECT UserId,Fname,Lname,Email,IsTeacher FROM account"
    sql.query(qstring, (err, rows, fields) => {
        console.log(rows);
        res.json(rows);
    })


});

app.get("/account/:id", (req, res)=>{
    const qstring = "SELECT UserId,FName,LName,Email,IsTeacher FROM account WHERE UserId = ?"

    sql.query(qstring, [req.params.id], (err, rows, fields) => {

        res.json(rows);
    })

});


app.get("/getAccount/", (req, res)=>{
    const qstring = "SELECT UserId,FName,LName,Email,IsTeacher FROM account WHERE UserId = ?"

    sql.query(qstring, [req.session.passport.user.user_id], (err, rows, fields) => {

        res.json(rows);
    })

});
//For create session
app.get("/tSession", (req, res) => {
    console.log(req.session.passport.user.user_id)
    const qstring = "SELECT * FROM teacher_sessions WHERE TeacherId = ?"
    sql.query(qstring, [req.session.passport.user.user_id], (err, rows, fields) => {
        res.json(rows);
    })

});

//for session after search
app.get("/tSession/:id", (req, res) => {
    console.log(req.session.passport.user.user_id)
    const qstring = "SELECT * FROM teacher_sessions WHERE TeacherId = ?"
    sql.query(qstring, [req.params.id], (err, rows, fields) => {
        res.json(rows);
    })

});

//Getting all session using student id
app.get("/studentSession/:id", (req, res) => {
    const qstring = "SELECT * FROM student_sessions WHERE StudentId = ?"
    sql.query(qstring, [req.params.id], (err, rows, fields) => {
        res.json(rows);
    })

});

//Getting all session using session id
app.get("/sSession/:id", (req, res) => {
    const qstring = "SELECT * FROM student_sessions WHERE SessionNumber = ?"
    sql.query(qstring, [req.params.id], (err, rows, fields) => {
        res.json(rows);
    })

});



app.get("/classSession/:id", (req, res)=>{
    const qstring = "SELECT * FROM class_sessions WHERE ClassIDs = ?"
    sql.query(qstring, [req.params.id],(err, rows, fields) =>{
        res.json(rows);
    }) 

});

app.get("/searchSession/:id", (req, res)=>{
    const qstring = "SELECT DISTINCT UserId,FName,LName FROM account \
    INNER JOIN teacher_sessions ON account.UserID = teacher_sessions.TeacherID \
    INNER JOIN session ON teacher_sessions.SessionNumb = session.SessionId \
    INNER JOIN class_sessions ON class_sessions.SessionNum = session.SessionId AND class_sessions.ClassIDs = ?"
    
    sql.query(qstring, [req.params.id],(err, rows, fields) =>{
        res.json(rows);
    }) 

});


app.get("/cSession/:id", (req, res) => {
    const qstring = "SELECT * FROM class_sessions WHERE SessionNum = ?"
    sql.query(qstring, [req.params.id], (err, rows, fields) => {
        res.json(rows);
    })

});



app.get("/session/:id", (req, res) => {
    const qstring = "SELECT * FROM session WHERE SessionId = ?"
    sql.query(qstring, [req.params.id], (err, rows, fields) => {
        res.json(rows);
    })

});

app.get("/checkStudent/:id", (req, res)=>{
    if (req.session.passport.user.user_id == req.params.id){
        res.json({check: true})
    }else{
        res.json({check: false})
    }
})

app.get("/isTeacher", (req, res)=>{
    console.log("isTeacher being called")
    console.log(req.session.passport)
    res.json({tutor: req.session.passport.user.tutor})
})

//Getting all session with a specific tutor and class
app.get("/session/:id", (req, res)=>{
    const qstring = "SELECT * FROM session WHERE SessionId = ?"
    sql.query(qstring, [req.params.id],(err, rows, fields) =>{
        res.json(rows);
    }) 

});

app.put('/sSession/:id', (req, res)=>{
    var q = "INSERT INTO student_sessions(StudentID,SessionNumber)  VALUES (?,?)  "
    sql.query(q, [req.session.passport.user.user_id, req.params.id], (err, rows, fields) => { //change
        if (!err){
            
            console.log("Inserted student session")
            res.status(200).end();
            
        }else
            console.log(err);
    })
})



app.post('/create-session', urlencodedParser, (req, res) => {

    var elm=req.body;
    var c = elm.class.split("  ")
    
    // var q = "SET @Day = ?;SET @Start_Time = ?;SET @End_Time = ?;SET @PlaceOfTutoring = ?; \
    // CALL session(@Day,@Start_Time,@End_Time,@PlaceOfTutoring);";
    var q = ["INSERT INTO session(Day,Start_Time,End_Time,PlaceOfTutoring)  VALUES (?,?,?,?) ",
    "INSERT INTO teacher_sessions(TeacherID,SessionNumb)  VALUES (?,?)  ",
    "INSERT INTO class_sessions(SessionNum,ClassIDs,ClassNames)  VALUES (?,?,?)  "]
    
    
    sql.query(q[0], [elm.day, elm.sTime+":00", elm.eTime+":00", elm.place], (err, rows, fields) => {
        
        if (!err){
            
            sql.query(q[1], [req.session.passport.user.user_id,rows.insertId], (err, rows, fields) => { 
                if (!err){
                    console.log("Inserted teacher session")

                } else
                    console.log(err);
            })

            sql.query(q[2], [rows.insertId, c[0], c[1]], (err, rows, fields) => {
                if (!err) {
                    console.log("Inserted class session")
                    res.redirect("/create-session")
                } else
                    console.log(err);
            })

        } else
            console.log(err);
    })
});


app.post('/update-session/:id', urlencodedParser, (req, res) => {

    var elm = req.body;
    var c = elm.class.split("  ")

    // var q = "SET @Day = ?;SET @Start_Time = ?;SET @End_Time = ?;SET @PlaceOfTutoring = ?; \
    // CALL session(@Day,@Start_Time,@End_Time,@PlaceOfTutoring);";
    var q = ["UPDATE session SET Day=?, Start_Time=?, End_Time=?, PlaceOfTutoring=?  WHERE SessionId=?;",
        "UPDATE class_sessions SET ClassIDs=?, ClassNames=?  WHERE SessionNum=?;"]


    sql.query(q[0], [elm.day, elm.sTime, elm.eTime, elm.place, req.params.id], (err, rows, fields) => {
        
        if (!err){
            
            sql.query(q[1], [c[0], c[1],  req.params.id], (err, rows, fields) => { 
                if (!err){
                    console.log("Updated class session")
                    res.redirect("/create-session")
                } else
                    console.log(err);
            })

        } else
            console.log(err);
    })
});


//deleting a session using session id
app.delete('/sSession/:id', (req, res) => {
    sql.query('DELETE FROM student_sessions WHERE SessionNumber = ?', [req.params.id], (err, rows, fields) => {
        if (!err){
            console.log("Deleted student session")
            res.status(200).end();
        }else
            console.log(err);
    })


});

//deleting a session using student id
app.delete('/studentSession/:id', (req, res) => {
    sql.query('DELETE FROM student_sessions WHERE StudentID = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            console.log("Deleted student session")
        else
            console.log(err);
    })


});

app.delete('/session/:id', urlencodedParser, (req, res) => {
    sql.query('DELETE FROM teacher_sessions WHERE SessionNumb = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            console.log("Deleted teacher session")
        else
            console.log(err);
    })

    sql.query('DELETE FROM class_sessions WHERE SessionNum = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            console.log('Deleted class session.');
        else
            console.log(err);
    })

    sql.query('DELETE FROM student_sessions WHERE SessionNumber = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            console.log("Deleted student session")
        else
            console.log(err);
    })




    sql.query('DELETE FROM session WHERE SessionId = ?', [req.params.id], (err, rows, fields) => {
        console.log("deleting session")
        if (!err) {
            console.log('Deleted session.');
            res.status(200).end();
        }
        else
            console.log(err);
    })
});




//------------------------------------------------------------------------------------------------


app.get("/", (req, res) => {

    res.sendFile(__dirname + "/main.html");

});

app.get("/session", authenticationMiddleware(), (req, res) => {

    res.sendFile(__dirname + "/session.html");

});


app.get("/create-session", authenticationMiddleware(), (req, res) => {
    console.log(req.session.passport.user.user_id)
    if(req.session.passport.user.tutor == 1){
         res.sendFile(__dirname + "/createSession.html");
    }else{
        res.sendFile(__dirname + "/postlogin.html");
    }
    

});

app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/login.html");

});

app.post("/login", passport.authenticate('local', {
    successRedirect: "/search",
    failureRedirect: "/login"
}));

app.get("/logout", (req, res) => {
    req.logout();
    req.session.destroy();
    res.sendFile(__dirname + "/main.html");

});

app.get("/search", authenticationMiddleware(), (req, res) => {
    res.sendFile(__dirname + "/postlogin.html");

});

app.get("/re_create_account", (req, res) => {
    res.sendFile(__dirname + "/re_create_account.html");
});

app.get("/createAccount", (req, res)=>{
    res.sendFile(__dirname+"/create_account.html");
    
});

app.get("/re_create_account", (req, res)=>{
    res.sendFile(__dirname+"/re_create_account.html");
    
});
app.get("/createAccountRedirect", (req, res)=>{
    
    var fname= req.query.fname;
    var lname = req.query.lname;
    var uid = req.query.uid;
    var email = req.query.email;
    var pw = req.query.pw;
    var isteach = req.query.isteach;
    if (isteach == "Yes") {
        isteach = 1;
    }
    else {
        isteach = 0;
    }
        
    var sqlString = "SELECT UserID FROM account WHERE UserID = ?";
    var values = [
        [uid, pw, fname, lname, email, isteach]
    ];
    
    sql.query(sqlString, uid, (err, result) => {
        if (err) throw err;
        if(result == ''){
            sqlString = "INSERT INTO account (UserID, password, FName, LName, Email, IsTeacher) VALUES ?";
            sql.query(sqlString, [values], (error, results) => {
                if (error) throw error;
                console.log("Account added");
            });
            // SELECT LAST_INSERT_ID() could probably replace the line directly below //
            res.sendFile(__dirname+"/login.html");
            /*
            sql.query('SELECT LAST_INSERT_ID() as user_id', function(error, results, fields) {
                if(error) throw error;
        
                const user_id = results[0];
        
                req.login(user_id, function(err) {
                    res.redirect('/search');
                });
        
            });
            */
        }
        if(result != ''){
            res.redirect("/re_create_account");
        }
    });
});

app.get("/aboutUs", (req, res) => {
    res.sendFile(__dirname + "/aboutus.html");

});
app.get("/account", authenticationMiddleware(), (req, res) => {
    res.sendFile(__dirname + "/accountdetails.html");

});

passport.serializeUser(function (user_id, done) {
    done(null, user_id);
});

passport.deserializeUser(function (user_id, done) {
    done(null, user_id);
});

function authenticationMiddleware() {
    return (req, res, next) => {
        console.log('req.session.passport.user: ${JSON.stringify(req.session.passport)}');

        if (req.isAuthenticated()) return next();

        res.redirect('/login');
    }
}

app.listen(3000);
