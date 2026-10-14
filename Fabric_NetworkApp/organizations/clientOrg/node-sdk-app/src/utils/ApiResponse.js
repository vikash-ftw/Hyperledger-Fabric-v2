"use strict";

class ApiResponse {
  constructor(statuscode, data, message = "Success") {
    this.statuscode = statuscode;
    this.data = data;
    this.message = message;
    this.success = statuscode < 400; // status code should be < 400
  }
}

export { ApiResponse };
