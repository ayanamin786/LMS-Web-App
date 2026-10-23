let courseName = document.getElementById("courseName") ;
let teacherName = document.getElementById("teacherName");
let duration = document.getElementById("duration");
let fees = document.getElementById("fees");

async function addCourse(){
    // alert("Course Added Successfully");
    // await firebase.database().ref("allCourses").set()
       await firebase.database().ref("allCourses").push({
        CourseName : courseName.value.trim(),
         teacherName : teacherName.value.trim(),
          duration : duration.value.trim(),
           fees : fees.value.trim()
    })
    .then(()=>{
        alert("Course Added Successfully");
        console.log("Course Added Successfully");
    })
    .catch((error)=>{
        console.error("Error adding course: ", error);
        alert("Failed to add course. Please try again.");
    });
}