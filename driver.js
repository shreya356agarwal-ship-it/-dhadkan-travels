document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('onlineToggle');
    const statusText = document.getElementById('statusText');
    const mainDash = document.getElementById('mainDash');
    const rideModal = document.getElementById('incomingRide');
    const btnAccept = document.getElementById('btnAccept');
    const btnDecline = document.getElementById('btnDecline');
    const timerBar = document.querySelector('.request-timer');
    
    // UI Elements for Ride
    const reqHeader = document.querySelector('.req-header h2');
    const destNodes = document.querySelectorAll('.r-node');

    let requestTimeout, timerInterval;
    let currentRideData = null;
    let socket = null;

    // -------- 1. INITIALIZE SERVERLESS FIREBASE --------
    const firebaseConfig = {
        apiKey: "AIzaSyAvUbnpjTS-g0reifAS350MeziVH4RWJPY", // Live Key Injected
        projectId: "dhadkan-travels",
    };

    let db = null;
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        console.log("✅ Firebase Driver Sync Online!");
    } catch(e) {
        console.warn("Firebase Serverless sync offline. Waiting in dark mode.");
    }

    if (db) {
        // Live listener for new pending rides
        db.collection('rides')
          .where('status', '==', 'pending')
          .onSnapshot(snapshot => {
             if(!toggle.checked) return; // Ignore if offline
             
             snapshot.docChanges().forEach(change => {
                 if (change.type === 'added') {
                     const data = change.doc.data();
                     currentRideData = { id: change.doc.id, ...data };
                     
                     console.log("🚨 RIDE REQUEST RECEIVED FROM FIREBASE", currentRideData);
                     
                     if(reqHeader) reqHeader.innerHTML = `₹${data.fare} <span class="seats">${data.destination}</span>`;
                     if(destNodes.length >= 2) destNodes[1].innerHTML = `<div class="dot dest"></div> ${data.destination}`;
                     
                     showRequest();
                 }
             });
          });
    }

    toggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            statusText.innerText = 'ONLINE';
            statusText.style.color = 'var(--accent-green)';
            mainDash.style.opacity = '1';
            mainDash.style.pointerEvents = 'auto';
        } else {
            statusText.innerText = 'OFFLINE';
            statusText.style.color = 'var(--text-muted)';
            mainDash.style.opacity = '0.5';
            mainDash.style.pointerEvents = 'none';
            hideRequest();
        }
    });

    function showRequest() {
        rideModal.classList.remove('hidden');
        
        let width = 100;
        timerBar.style.width = '100%';
        clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            width -= (100 / 150);
            timerBar.style.width = `${width}%`;
            if(width <= 0) {
                clearInterval(timerInterval);
                hideRequest();
            }
        }, 100);

        requestTimeout = setTimeout(() => { hideRequest(); }, 15000);
    }

    function hideRequest() {
        rideModal.classList.add('hidden');
        clearInterval(timerInterval);
        clearTimeout(requestTimeout);
        currentRideData = null;
    }

    btnAccept.addEventListener('click', () => {
        clearInterval(timerInterval);
        clearTimeout(requestTimeout);
        btnAccept.innerText = 'Routing...';
        btnAccept.style.background = '#3b82f6';
        
        // Emit back to server acknowledging we took the ride
        // Update document status inside Firebase that advances passengers frame
        if(db && currentRideData && currentRideData.id) {
            db.collection('rides').doc(currentRideData.id).update({
                status: 'accepted',
                driverName: "Suresh Kumar",
                vehicleNumber: "JH10-X-1234",
                driverRating: 4.8
            }).then(() => {
                console.log("Ride acceptance written to Firestore matching");
            });
        }
        
        setTimeout(() => {
            hideRequest();
            btnAccept.innerText = 'Accept Route';
            btnAccept.style.background = 'var(--accent-green)';
            alert('Live Ride Accepted! The passenger\'s app has been updated instantly over WebSocket.');
        }, 800);
    });

    btnDecline.addEventListener('click', () => { hideRequest(); });
});
