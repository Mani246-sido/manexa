import jwt from 'jsonwebtoken';

export const  verifyToken = (req, res, next) => {
    try {
        const authheader = req.headers.authorization;
        if (!authheader || !authheader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }
        const token = authheader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

export  const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        //lets check if theres a user in req or not
        if(!req.user || !roles.user.role){
            return res.status(403).json({message:"Access denied,as user not found"});

        }
        if(!roles.includes(req.user.role)){
            return res.status(403).json({message:"Access denied, insufficient permissions"});
        }
        next();
    }
};