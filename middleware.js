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