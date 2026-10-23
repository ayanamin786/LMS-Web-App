var ttlusers = document.getElementById('ttlusers');
var ttluser = document.getElementById('ttluser');
var username = document.getElementById("name");
var tbody = document.getElementById("tbody")

async function alldataget() {

  try {
    const snapshot = await firebase.database().ref("enrollStudents").get();
    const students = snapshot.val();
    const count = students && typeof students === "object"
      ? Object.keys(students).length
      : 0;

    if (ttlusers) ttlusers.textContent = count;
    if (ttluser) ttluser.textContent = count;
  } catch (error) {
    console.error("Unable to load the student count.", error);
  }

}

alldataget();

async function students () {
  if (!tbody) return;

  try {
    const snapshot = await firebase.database().ref("enrollStudents").get();
    const records = snapshot.val();
    const data = records && typeof records === "object"
      ? Object.values(records)
      : [];

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No students have enrolled yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map((result) => `
                                    <tr>

                                        <td>
                                            <div class="user-cell">

                                                <div class="user-avatar avatar-three">
                                                    ${result["firstName"][0] + ["lastName"] }
                                                </div>

                                                <div>
                                                    <strong>${result["firstName"]}</strong>
                                                   
                                                </div>

                                            </div>
                                        </td>

                                        <td> <span>${result["email"]}</span></td>
                                        <td>${result["createdAt"]}</td>
                                        <td>${result["course"]}</td>
                                        <td>${result["message"]}</td>


                                    </tr>


                                  
      
      
      `).join("");
  } catch (error) {
    console.error("Unable to load the student list.", error);
    tbody.innerHTML = '<tr><td colspan="5">Student records could not be loaded.</td></tr>';
  }

} 
students()
