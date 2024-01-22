const imageSchema = require('./models/img')
module.exports.isLoggedIn = (req,res,next)=>{
    // coming from passport
    if(!req.isAuthenticated()){
        req.session.returnTo = req.originalUrl;
        req.flash('error','you must be signed in');
        // return so rest does not run afterwards
        return res.redirect('/users/login-render');
    }
    next();
};
module.exports.storeReturnTo = (req,res,next)=>{
    if(req.session.returnTo){
        res.locals.returnTo = req.session.returnTo;
    }
    next();
};
module.exports.validateImg = ((req,res,next)=>{
    
    // pass our schema to be validated
    const {error} = imageSchema.validate(req.body);
    // if error is caught pass it as ExpressError function and onto basic error handler callback
    if(error){
        // map over error.detials to make join the message
        const msg = error.details.map(el=>el.message).join(',')
        // if error caught we throw an error 
        // must pass the parameters in the correct order our error handler asks for 

        throw new ExpressError(400,msg)
    }else{
        // if we find no error then we just pass onto the route handler, the end point
        next();
    }
});