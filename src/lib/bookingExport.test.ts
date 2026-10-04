import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";
import { bookingExportFilename, buildBookingExportRows, createBookingWorkbook } from "@/lib/bookingExport";
type Member = Database["public"]["Tables"]["booking_members"]["Row"];
const booking = (overrides: Partial<Booking> = {}): Booking => ({ id:"a",trek_id:"trip",trek_name:"Ahobilam Eastern Trail",trek_date:"2026-10-16",primary_name:"Explorer",primary_phone:"+910012345678",primary_age:30,primary_gender:"Other",created_at:"2026-09-01",selected_package_name:"With travel",payment_status:"partial",status:"confirmed",booking_total:1000,amount_paid:250,seats_booked:2,primary_no_show:false, ...overrides });
const member = (overrides: Partial<Member> = {}): Member => ({ id:"m1",booking_id:"a",full_name:"Companion",age:null,gender:null,phone:"0012345678",email:null,aadhaar_number:"secret",aadhaar_photo:"",created_at:"2026-09-01",no_show:false,...overrides });
describe("confirmed member export",()=>{
 it("exports exactly the requested fields, numbering participants, and retains phones as text",async()=>{
  const {memberRows}=buildBookingExportRows([booking(),booking()], [member(),member()],[]);
  expect(memberRows).toHaveLength(2);expect(Object.keys(memberRows[0])).toEqual(["S.No.","Name","Age","Mobile Number","Package Type","Payment Status"]);
  expect(memberRows[1]).toMatchObject({"S.No.":2,Name:"Companion",Age:"", "Mobile Number":"0012345678","Package Type":"With travel","Payment Status":"Partially paid"});
  expect(JSON.stringify(memberRows)).not.toContain("secret");
  const {XLSX,workbook}=await createBookingWorkbook([booking()],[member()],[]);const reopened=XLSX.read(XLSX.write(workbook,{bookType:"xlsx",type:"array"}),{type:"array"});
  expect(reopened.SheetNames).toEqual(["Members"]);expect(reopened.Sheets.Members.D2).toMatchObject({t:"s",v:"+910012345678"});expect(reopened.Sheets.Members.D3).toMatchObject({t:"s",v:"0012345678"});
 });
 it("excludes cancelled and pending bookings and only omits the no-show people in a confirmed group",()=>{
  const rows=buildBookingExportRows([booking(),booking({id:"cancel",status:"cancelled"}),booking({id:"pending",status:"pending"})],[member({no_show:true}),member({id:"m2",full_name:"Attended",no_show:false}),member({id:"m3",booking_id:"cancel"})],[]);
  expect(rows.bookingCount).toBe(1);expect(rows.memberRows.map(x=>x.Name)).toEqual(["Explorer","Attended"]);
 });
 it("excludes a no-show primary while retaining attending members",()=>{
  const rows=buildBookingExportRows([booking({primary_no_show:true})],[member()],[]);
  expect(rows.memberRows.map(x=>x.Name)).toEqual(["Companion"]);
 });
 it("applies name, phone, age, and gender filters to individual exported participants",()=>{
  const rows=buildBookingExportRows([booking()],[member({full_name:"Ravi",age:24,gender:"Male",phone:"5551234567"}),member({id:"m2",full_name:"Maya",age:31,gender:"Female"})],[],{query:"ravi",age:"24",gender:"Male"});
  expect(rows.memberRows.map(row=>row.Name)).toEqual(["Ravi"]);
  expect(buildBookingExportRows([booking()],[member({full_name:"Ravi",age:24,gender:"Male"}),member({id:"m2",full_name:"Maya",age:31,gender:"Female"})],[],{age:"31",gender:"Female"}).memberRows.map(row=>row.Name)).toEqual(["Maya"]);
 });
 it("creates the requested filename from the first trip word and departure",()=>{
  expect(bookingExportFilename("Ahobilam Navanarasimha Trek","2026-10-16")).toBe("Ahobilam_2026-10-16.xlsx");
  expect(()=>bookingExportFilename("Trek","all")).toThrow("departure date");
 });
 it("does not build a workbook when there are no eligible participants",async()=>{
  await expect(createBookingWorkbook([booking({status:"cancelled"})],[],[])).rejects.toThrow("No eligible confirmed");
 });
});
