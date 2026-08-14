"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSoftDelete = exports.SoftDelete = exports.initializeAudit = exports.Audited = void 0;
var audited_decorator_1 = require("./audited.decorator");
Object.defineProperty(exports, "Audited", { enumerable: true, get: function () { return audited_decorator_1.Audited; } });
Object.defineProperty(exports, "initializeAudit", { enumerable: true, get: function () { return audited_decorator_1.initializeAudit; } });
var soft_delete_decorator_1 = require("./soft-delete.decorator");
Object.defineProperty(exports, "SoftDelete", { enumerable: true, get: function () { return soft_delete_decorator_1.SoftDelete; } });
Object.defineProperty(exports, "initializeSoftDelete", { enumerable: true, get: function () { return soft_delete_decorator_1.initializeSoftDelete; } });
//# sourceMappingURL=index.js.map