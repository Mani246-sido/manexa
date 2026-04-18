class ApiError extends Error {
    constructor(
        message="something went wrong",
        statuscode,
        errors=[],
        stack=""
        

    
    ){
    super(message);
    this.message=message;
    this.statuscode = statuscode;
    this.errors = errors;
    this.success = false;
    this.data = null;
    if(stack){
        this.stack=stack
    }
    else{
        stack.CaptureStackTrace(this,this.constructor)
    }
    }
    

}
export {ApiError}