import  { Schema, Mongoose} from "mongoose"

const mongoose = new Mongoose();

mongoose.connect("mongodb+srv://sukeshp:x21qkXQYjY5XbopS@cluster0-lxsof.mongodb.net/test?retryWrites=true");

const partSchema: Schema = new Schema({
    partNo: {type: String, required: true},
    quantity: {type: Number, required: true},
    date: {type: Date, required: true},
    saleType: {type: String, enum: ["Counter", "Workshop"], required: false},
    checkpoint: {type: String, required: true},
});

export default mongoose.model('Part', partSchema);

