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

export const rolesauthorized = (...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            return res.status(403).json({message:"Forbidden: You don't have permission to access this resource"});
        }        next();

    }
}