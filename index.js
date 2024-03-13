
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
        return res.status(400).send("Invalid Marks!  Range between 0 - 100")
    }

    const tamilMark = parseFloat(tamil);
    const englishMark = parseFloat(english);
    const mathsMark = parseFloat(maths)

    const totalMark = tamilMark + englishMark + mathsMark;
    const averageMark = parseFloat((totalMark / 3)).toFixed(2);

    // Add student details in firestore
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
        functions.logger.log("A student addded succesfull")
        return res.status(200).send('Student-Information succesffully added')
    })
    .catch(err => {
        console.log(err);
        return res.status(500).send('Error occured')
    })

})
// onWrite used for all document changes
// onCreate
exports.AddSummaryChange = functions.firestore.document('summary/{summaryId}').onCreate((change,context) => {
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
// ********************************************************************************************

// UPDATE
exports.updateData = functions.https.onRequest(async(req,res) => {
    try{
        if(req.method !== 'PUT'){
           return res.status(400).send("Invalid request method!")
        }
        const name = req.query.name;
        if(!name){
            return res.status(400).send("Please provide valid name")
        }

        const studentRef = firestore.collection('summary').doc(name);
        const docStudent = await studentRef.get();
        if(!docStudent.exists){
            return res.status(404).send("Not Found");
        }

        const tamilMark = parseFloat(req.body.tamil);
        const englishMark = parseFloat(req.body.english);
        const mathsMark = parseFloat(req.body.maths)
    
        const totalMark = tamilMark + englishMark + mathsMark;
        const averageMark = parseFloat((totalMark / 3)).toFixed(2);
        
    
        return await studentRef.set({
        tamil : tamilMark,
        english: englishMark,
        maths: mathsMark,
        totalMark: totalMark,
        averageMark: averageMark
    },{ merge: true})
    .then(() => {
        functions.logger.log("Succesfully updated")
        return res.status(200).send('Student-Information succesffully updated')
    })
    }catch(err){
        console.log(err);
        return res.status(500).send('Error occured')
    }
    })
exports.updateDataInDocuments = functions.firestore.document('summary/{summaryId}').onUpdate((change,context) => {
  const refSummary = firestore.collection('summary')
  return refSummary.get()
  .then(snapshot => {
    let totalMarks = 0 ;
    let totalStudents = 0;

    snapshot.forEach(doc =>{
        const studentData = doc.data();
        if(studentData.totalMark){
            totalStudents++;
            totalMarks = studentData.totalMark
        }
    })

    const averageMark = totalStudents > 0 ? totalMarks / totalStudents : 0;
    return refSummary.doc('summary-info')
    .set({
        totalStudents: totalStudents,
        averageMark: parseFloat(averageMark.toFixed(2))
    },{merge: true})
  })
  .then(() => {
    functions.logger.log("Summary-Info updated succesfully");
    return null;
  })
  .catch(err => {
    functions.logger.log("Error ",err);
    return null;
  })
  
})
// **********************************************************************************************


// DELETE

exports.deleteByName = functions.https.onRequest(async(req,res) =>{
    try{
        if(req.method !== 'DELETE'){
            return res.status(400).send('Invalid request method! Please use DELETE.')
        }
        const name = req.query.name;
        if(!name){
            return res.status(400).send("Please provide valid name")
        }

        const docRef =  firestore.collection('summary').doc(name);
        const docGet = await docRef.get();
        if(!docGet.exists){
            return res.status(404).send("Not Found");
        }
        await docRef.delete();
        return res.status(404).send('Succesfully deleted')
    } catch(err){
        functions.logger.log("Error occured ",err);
        return res.status(500).send('Error occured')
    }
})

exports.deleteDocByName = functions.firestore.document('summary/{summaryId}').onDelete((change,context) => {
    const deletedData = change.data();
    const totalMark = deletedData.tamil + deletedData.english + deletedData.maths;
    const averageMark = parseFloat((totalMark / 3).toFixed(2));
    return firestore.doc('summary/summary-info').set({
        totalStudents: admin.firestore.FieldValue.increment(-1),
        averageMark: averageMark
    },{merge: true})
})
