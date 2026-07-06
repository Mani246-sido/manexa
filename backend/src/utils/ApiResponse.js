class ApiResponse {
    constructor(
        statusCode,
        message = "Success",
        data = null
    ) {
        if (typeof statusCode !== "number") {
            throw new TypeError("statusCode must be a number");
        }

        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode >= 200 && statusCode < 300;
    }
}
export default ApiResponse;