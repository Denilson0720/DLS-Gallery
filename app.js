if(process.env.NODE_ENV !=='production'){
    require('dotenv').config();
}
const express = require('express');
const ejsMate = require('ejs-mate');
const path = require('path');
// const multer  = require('multer')
const imageSchema = require('./models/img.js');
const User = require('./models/user.js');
const mongoose = require('mongoose');
const ExpressError = require('./utils/ExpressError.js');
const catchAsync = require('./utils/catchAsync.js');
const multer = require('multer');
const methodOverride = require('method-override');
const session  = require('express-session')
// CONNECT FLAST, DEPENDENT ON SESSIONS, CONFIGURE SESSION FIRST
const flash = require('connect-flash');
const {isLoggedIn,storeReturnTo,validateImg} = require('./middleware.js');

const {cloudinary} = require('./cloudinary');

// import cloudinary settings, and storage bucket location
const {storage} = require('./cloudinary');

// upload to cloudinary storage address object made in cloudinary/index
const upload = multer({storage});
// authentication using passport
const passport = require('passport');
const LocalStrategy = require('passport-local');


// local DB
// const dbURL = 'mongodb://localhost:27017/dls-gallery';
// mongo atlas cluster
const dbURL = process.env.DB_URL

const MongoStore = require('connect-mongo');
const store = MongoStore.create({
    mongoUrl:dbURL,
    touchAfter:24*60*60,
    crypto:{
        secret:'secret'
    }
});
store.on('error',function(e){
    console.log('session store error', e)
})

mongoose.connect(dbURL,{});
const db = mongoose.connection;
db.on("error",console.error.bind(console,"connection error:"));
db.once("open",()=>{
    console.log('Database connected!');
});

const sessionConfig = {
    // name for cookie session
    store,
    name :'session',
    secret: 'secret',
    resave:false,
    saveUninitialized:true,
    cookie:{
        //cookie will expire after a day, calculated in miliseconds
        // httpOnly does not allow user to access cookies in broswer using js script
        httpOnly:true,
        expires:Date.now()+86400000,
        maxAge:1000*60*60*24*7
    }

}
const app = express();

app.engine('ejs',ejsMate);
app.set('view engine','ejs');
app.use(express.urlencoded({extended:true}));
app.set('views',path.join(__dirname,'views'));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname,'public')));

// session and passport authentication setup
app.use(session(sessionConfig));

app.use(flash());
app.use(passport.initialize());
// passport.session must come after session
app.use(passport.session());
// passport use localstrat from us  er model
// for localstrat use authenticate method stored in User model, made automatically by Passport
// authenticate is a static function
passport.use(new LocalStrategy(User.authenticate()))
// serealization, how we store user in session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    // in all templates/requests we have access to req.user as currentUser
    res.locals.currentUser = req.user;
    // on every single request we have access to whats within flash as success by calling success locally
    res.locals.success = req.flash('success');
    // if there is anything stored within the flash as error
    res.locals.error = req.flash('error');

    next();
})


app.get('/',storeReturnTo,catchAsync(async(req,res)=>{
    // old schema 
    // const image = await imageSchema.findById('65a6e5a4082e6b7cd45034c1').populate();
    // new schema, connected to mongo cluster instance
    const image = await imageSchema.findById(process.env.IMAGE_ID).populate();
    res.render('index',{image})
}));
// users routes
app.get('/users/admin',isLoggedIn,catchAsync(async(req,res)=>{
    req.flash('sucess','Welcome bro! I mean admin!');
    const image = await imageSchema.findById(process.env.IMAGE_ID).populate();
    res.render('admin',{image});
}));
app.get('/users/login-render',catchAsync(async(req,res)=>{
    res.render('login');
}));
app.post('/users/login',passport.authenticate('local',{failureFlash:true,failureRedirect:'/login'}), catchAsync(async(req,res)=>{
    req.flash('success','welcome back!');
    // returnToURL ?? maybe
    res.redirect('/users/admin');
}));
app.get('/users/registration-render',(req,res)=>{
    res.render('registration')
});
app.post('/users/register',catchAsync(async(req,res)=>{
    try{
        const {email,username,password,accessToken} = req.body;
        // make a new user with email and username
        const user = new User({email,username,accessToken});
        // use passport package to register user, with password, password is hashed and salted by passport package
        // if(key!==process.env.ADMIN_SECRET){
        //     req.flash('error','Wrong admin key, please ask admin for correct key!');
        //     return res.redirect('/users/registration-render');
        // }
        const registeredUser = await User.register(user,password);
      
        req.login(registeredUser,err=>{
            if(err) return next(err);
            req.flash('success','welcome to yelp camp!');
            res.redirect('/users/admin')
        })
        }catch(e){
            req.flash('error',e.message)
            res.redirect('/users/registration-render')
        }
}));
app.get('/users/logout',catchAsync(async(req,res,next)=>{
    // logout faciliated through passport package
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Goodbye!');
        res.redirect('/');
    });
}));
// multer middlware handles file uploads
app.put('/images/:id/edit',isLoggedIn,validateImg,upload.array('image'),catchAsync(async(req,res)=>{
    
    // const image = await imageSchema.findByIdAndUpdate(id,{ ...req.body.images});
    const{id} = req.params;
    const image = await imageSchema.findById(id);
    const newImages = req.files.map(f=>({url:f.path,filename:f.filename}))
    // push the new images alongside the existent images, so as to not overwrite them
    // spread the imgs to pass then into the push function as individual files
    image.images.push(...newImages);
    await image.save();
    console.log(req.body.deleteImage);
    // if we return anything in deleteImage object
    if(req.body.deleteImage){
        // delete all cloudinary instances linked to a filename within deleteImage object we return 
        for(let filename of req.body.deleteImage){
            await cloudinary.uploader.destroy(filename);
        }
        
        // no need to .save(),mongoose direct save
        await image.updateOne({$pull:
            {images:
                {filename:
                    {$in:req.body.deleteImage}}}});
        
    }
        

    req.flash('success','succesfully edited gallery collection');
    res.redirect('/users/admin');

}));


// ********************************************
// OLD ROUTES, MUST INTEGRATE WITH NEW ROUTES
// ROUTES TO CREATE A NEW imgSchema model
// RENDER NEW CATEGORY/SCHEMA FORM
app.get('/users/create-new-category-render',isLoggedIn,(req,res)=>{
    res.render('newImgForm');
})
// CREATE NEW CATEGORY/SCHEMA
app.post('/users/create-new-category',isLoggedIn,upload.array('image'),async(req,res)=>{
    try {
        // Assuming 'images' is the field name in your imageSchema
        const newImg = new imageSchema();
        // save url, and filename to images element within schema
        newImg.images = req.files.map((file) => ({ url: file.path, filename: file.filename }));
        await newImg.save();
        res.redirect(`/images/${newImg._id}/show`);
        // res.send(newImg);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
// SHOW THE NEW CATEGORY...FIX THIS: INTEGRATE WITH NEW ROUTES
app.get('/images/:id/show',async(req,res)=>{
    const image = await imageSchema.findById(req.params.id).populate();
    res.render('show',{image});
})

app.get('/image/:id/edit',isLoggedIn,async(req,res)=>{
    const {id} = req.params;
    const image = await imageSchema.findById(id)
    if(!image){
        res.send('error cannot find that schema');
        return res.redirect('/campgrounds');
    }
    res.render('edit',{image});
})
// route to add to newImg array
app.put('/addImage/:id',isLoggedIn,upload.array('image'),async(req,res)=>{
    // add to specific image schema using its specific objectId given by mongoDB
    const{id} = req.params;
    const image  = await imageSchema.findByIdAndUpdate(id,{...req.body.image});
    const imgs = req.files.map(f=>({url:f.path,filename:f.filename}));
    image.images.push(...imgs);
    await image.save();
    res.redirect(`/showImagesCollection/${image._id}`)
});

// *****************************************
// OLD ROUTES END

app.all('*',(req,res,next)=>{
    // res.send('404 NOT FOUND');
    // we set the message and error code using the expressError class
    // pass it to next, basic error handler callback
    next(new ExpressError(404,'Page Not Found'));
});
app.use((err, req, res, next) => {
    // res.status(500).send('Something broke!')
    const{statusCode = 500} = err;
    // render the error template
    if(!err.message){err.message = 'Oh no Error'}
    res.status(statusCode).render('error',{err});
  });

app.listen(3000,()=>{
    console.log('Listening on port 3000');
})