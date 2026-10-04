import { describe, expect, it } from "vitest";
import { refundStatus, validateRefund } from "./bookingRefunds";
describe("booking refund records",()=>{
 it("derives refund statuses from approved and returned amounts",()=>{expect(refundStatus(null,null)).toBe("not_applicable");expect(refundStatus(250,0)).toBe("pending");expect(refundStatus(250,100)).toBe("partial");expect(refundStatus(250,250)).toBe("refunded");});
 it("checks cumulative returned amount, remaining amount and received cap",()=>{expect(validateRefund(500,"250","100")).toMatchObject({approved:250,refunded:100,remaining:150,status:"partial"});expect(()=>validateRefund(100,"200","0")).toThrow("cannot exceed");expect(()=>validateRefund(500,"100","101")).toThrow("cannot exceed");});
});
