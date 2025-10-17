import mongoose from "mongoose";

export const connectDb = ()=>{
  mongoose.connect(process.env.MONGO_URI).then(()=>{
      console.log("mongodb connected")
  }).catch((err)=>{
    console.log(err)
  })
}