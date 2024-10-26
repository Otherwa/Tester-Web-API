const mongoose = require('mongoose');

// Define the schema for patient data
const PatientDataSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
    },
    type: String,
    name: String,
    age: String,
    gender: String,
    address: String,
    city: String,
    pcode: String,
    contact: String,
    dstatus: String,
    diagnosticdm: String,
    cvds: String,
    htstatus: String,
    heartatrialfibrilation: String,
    heartattack: String,
    stroke: String,
    chestpain: String,
    painlarm: String,
    pacemaker: String,
    ulcerslfoot: String,
    ulcersrfoot: String,
    footnumber: String,
    foottingling: String,
    feeldamagelfoot: String,
    feeldamagerfoot: String,
    autodoppler: String,
    bproblem: String,
    nauseaaftermeal: String,
    vomittingmeal: String,
    smoking: String,
    alcohol: String,
    familyhistoryDM: String,
    familyhistorycvd: String,
    exerciseintensity: String,
    weight: String,
    bmi: String,
    fastingbloods: String,
    earlymorningglucose: String,
    fastingglucose: String,
    hbA1c: String,
    urea: String,
    creatinine: String,
    triglyceride: String,
    hdl: String,
    ldl: String,
    cvdrisk: String,
    crp: String,
    gfr: String,
    ewingresult: String,
    lyingsbpavg: String,
    lyingdbpavg: String,
    stand1minsbp: String,
    stand1mindbp: String,
    stand3minsbp: String,
    stand3mindbp: String,
    reports: Object
}, {
    timestamps: true
});

// Create a model from the schema
const PatientData = mongoose.model('PatientData', PatientDataSchema);
module.exports = PatientData;
