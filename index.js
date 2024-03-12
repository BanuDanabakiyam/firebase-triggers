
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const functions =require('firebase-functions/v1');
const admin = require('firebase-admin')
admin.initializeApp();
const firestore = admin.firestore();

exports.getStudentDetails = functions.https.onRequest((req,res) => {
    if(req.method != 'GET'){
        return res.status(400).send('oh!...Invalid request method!')
    }
    const { name,tamil,english,maths } = req.query;
    if(!name || !tamil || !english || !maths){
        return res.status(400).send('Provide valid details of name, tamil, english, maths')
    }
    if(tamil > 100 || english > 100 || maths > 100){
        return res.status(400).send("Marks between 0 - 100")
    }

    const tamilMark = parseFloat(tamil);
    const englishMark = parseFloat(english);
    const mathsMark = parseFloat(maths)

    const totalMark = tamilMark + englishMark + mathsMark;
    const averageMark = parseFloat((totalMark / 3)).toFixed(2);

    // update student details in firestore
    const studentRef = firestore.collection('summary').doc(name);
    return studentRef.set({
        name : name,
        tamil : tamilMark,
        english: englishMark,
        maths: mathsMark,
        totalMark: totalMark,
        averageMark: averageMark
    },{ merge: true})
    .then(() => {
        return res.status(200).send('Student-Information succesffully updated')
    })
    .catch(err => {
        console.log(err);
        return res.status(500).send('Error occured')
    })

})
// onWrite used for all document changes
exports.updateSummaryChange = functions.firestore.document('summary/{summaryId}').onWrite((change,context) => {
    const refSummary = firestore.collection('summary');
    return refSummary.get().then(snapshot => {
        let totalStudents = 0;
        let totalMarks  = 0;

        snapshot.forEach(doc => {
            const studentData = doc.data();
            if(studentData.totalMark){
                totalStudents++;
                totalMarks += studentData.totalMark;
            }

        })

        const averageMark = totalStudents > 0 ? totalMarks / totalStudents : 0

        return refSummary.doc('summary-info').set({
            totalStudents: totalStudents,
            averageMark: parseFloat(averageMark.toFixed(1))
        },{merge: true})
    }).catch(err => {
        console.log(err)
        return res.status(500).send('error occured')
    })
})
  

