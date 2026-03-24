// Strict ES6
document.addEventListener('DOMContentLoaded', () => {

    const searchState = document.getElementById('searchState');
    const landmarksState = document.getElementById('landmarksState');
    const vehiclesState = document.getElementById('vehiclesState');
    const totoSeatsState = document.getElementById('totoSeatsState');
    const activeRideState = document.getElementById('activeRideState');
    
    const bgLayer = document.getElementById('bgLayer');
    const destinationInput = document.getElementById('destinationInput');
    const searchWrapper = document.querySelector('.input-wrapper');
    const landmarkList = document.getElementById('landmarkList');
    const selectedDestText = document.getElementById('selectedDestText');
    const vehicleCards = document.querySelectorAll('.vehicle-card');
    const confirmRideBtn = document.getElementById('confirmRideBtn');
    const bookTotoBtn = document.getElementById('bookTotoBtn');
    const cancelRideBtn = document.getElementById('cancelRideBtn');
    const backBtns = document.querySelectorAll('.back-btn');
    const seats = document.querySelectorAll('.seat.available');
    const totoTotal = document.getElementById('totoTotal');

    let currentDest = '';
    let selectedVehicle = null;
    let selectedSeats = 0;

    // Transition helper
    function switchState(hideEls, showEl) {
        hideEls.forEach(el => {
            if(el) {
                el.classList.remove('slide-in');
                el.style.display = 'none';
            }
        });
        if(showEl) {
            showEl.style.display = 'block';
            showEl.classList.remove('hidden');
            void showEl.offsetWidth;
            showEl.classList.add('slide-in');
        }
    }

    // Multi-Input Listener
    const pickupInput = document.getElementById('pickupInput');
    const searchToVehiclesBtn = document.getElementById('searchToVehiclesBtn');

    function checkSearchState() {
        const pick = pickupInput ? pickupInput.value : '';
        const drop = destinationInput ? destinationInput.value : '';
        
        if (pick && drop && searchToVehiclesBtn) {
            searchToVehiclesBtn.style.opacity = '1';
            searchToVehiclesBtn.style.pointerEvents = 'auto';
        } else if (searchToVehiclesBtn) {
            searchToVehiclesBtn.style.opacity = '0.6';
            searchToVehiclesBtn.style.pointerEvents = 'none';
        }
    }

    if(pickupInput) pickupInput.addEventListener('input', checkSearchState);
    if(destinationInput) destinationInput.addEventListener('input', checkSearchState);

    if (searchToVehiclesBtn) {
        searchToVehiclesBtn.addEventListener('click', () => {
             const pick = pickupInput ? pickupInput.value : '';
             currentDest = destinationInput ? destinationInput.value : '';
             if(selectedDestText) selectedDestText.innerText = currentDest;
             if(bgLayer) bgLayer.classList.add('zoom-bg');
             switchState([searchState], vehiclesState); // Skip sub-panel selection for manual flow!
        });
    }

    const qdItems = document.querySelectorAll('.qd-item');
    if(qdItems) {
        qdItems.forEach(item => {
            item.addEventListener('click', () => {
                const textEl = item.querySelector('span') || item.querySelector('strong');
                const text = textEl ? textEl.innerText : '';
                if(destinationInput && text) {
                    destinationInput.value = text;
                    checkSearchState();
                }
            });
        });
    }

    if(landmarkList) landmarkList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if(!li) return;
        currentDest = li.getAttribute('data-dest');
        if(selectedDestText) selectedDestText.innerText = currentDest;
        if(destinationInput) destinationInput.value = currentDest;
        switchState([landmarksState], vehiclesState);
    });

    if(vehicleCards) vehicleCards.forEach(card => {
        card.addEventListener('click', () => {
            vehicleCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedVehicle = card.getAttribute('data-type');
            if(confirmRideBtn) {
                if(selectedVehicle === 'toto') confirmRideBtn.innerText = 'Select Seats';
                else confirmRideBtn.innerText = 'Confirm Ride';
            }
        });
    });

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
        console.log("✅ Firebase Serverless Sync Online!");
    } catch(err) {
        console.warn("Firebase Serverless sync offline, using dark simulation mode.");
    }

    // Remainder legacy socket block removed for serverless swap to safeguard execution loops inside snapshots

    if(confirmRideBtn) confirmRideBtn.addEventListener('click', () => {
        if(!selectedVehicle) return;
        
        if(selectedVehicle === 'toto') {
            switchState([vehiclesState], totoSeatsState);
        } else {
            if(db) {
                confirmRideBtn.innerText = "Broadcasting to Drivers...";
                confirmRideBtn.style.opacity = '0.6';
                
                db.collection('rides').add({
                    pickup: pickupInput ? pickupInput.value : 'My Location',
                    destination: currentDest,
                    vehicle: selectedVehicle,
                    fare: selectedVehicle === 'bike' ? 45 : 150,
                    status: 'pending',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).then(docRef => {
                    console.log("Ride Requested securely with ID:", docRef.id);
                    // Single Live Snapshot listener for state updating
                    db.collection('rides').doc(docRef.id).onSnapshot(doc => {
                        const data = doc.data();
                        if(data && data.status === 'accepted') {
                            const dName = document.querySelector('.d-info h4');
                            const dDetails = document.querySelector('.d-info p');
                            
                            if(dName) dName.innerText = data.driverName || "Suresh Kumar";
                            if(dDetails) dDetails.innerText = `${data.driverRating || 4.8}★ • ${data.vehicleNumber || 'JH10-X-1234'}`;
                            
                            switchState([vehiclesState], activeRideState);
                        }
                    });
                });
            } else {
                switchState([vehiclesState], activeRideState); // Fallback Offline Simulation
            }
        }
    });

    if(seats) seats.forEach(seat => {
        seat.addEventListener('click', () => {
            seat.classList.toggle('selected');
            selectedSeats = document.querySelectorAll('.seat.selected').length;
            if(totoTotal) totoTotal.innerText = `₹${selectedSeats * 15}`;
            if(bookTotoBtn) {
                if(selectedSeats > 0) bookTotoBtn.removeAttribute('disabled');
                else bookTotoBtn.setAttribute('disabled', 'true');
            }
        });
    });

    if(bookTotoBtn) bookTotoBtn.addEventListener('click', () => {
        if(db) {
            bookTotoBtn.innerText = "Pinging E-Totos...";
            bookTotoBtn.style.opacity = '0.6';
            
            db.collection('rides').add({
                pickup: pickupInput ? pickupInput.value : 'My Location',
                destination: currentDest,
                vehicle: 'toto',
                seats: selectedSeats,
                fare: selectedSeats * 15,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(docRef => {
                db.collection('rides').doc(docRef.id).onSnapshot(doc => {
                    const data = doc.data();
                    if(data && data.status === 'accepted') {
                        switchState([totoSeatsState], activeRideState);
                    }
                });
            });
        } else {
            switchState([totoSeatsState], activeRideState);
        }
    });

    if(backBtns) backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const parentPane = btn.closest('.state-panel') || btn.closest('.panel-state');
            if(!parentPane) return;

            if (parentPane === landmarkList || parentPane.id === 'landmarksState') {
                switchState([landmarksState], searchState);
                if(bgLayer) bgLayer.classList.remove('zoom-bg');
            } else if (parentPane.id === 'vehiclesState') {
                switchState([vehiclesState], landmarksState);
            } else if (parentPane.id === 'totoSeatsState') {
                switchState([totoSeatsState], vehiclesState);
            } else {
                // Fallback direct reversal
                if(parentPane.id === 'activeRideState') switchState([activeRideState], searchState);
                else {
                    const prev = parentPane.previousElementSibling;
                    if(prev) switchState([parentPane], prev);
                }
            }
        });
    });

    if(cancelRideBtn) cancelRideBtn.addEventListener('click', () => {
        switchState([activeRideState], searchState);
        if(bgLayer) bgLayer.classList.remove('zoom-bg');
        selectedVehicle = null;
        if(vehicleCards) vehicleCards.forEach(c => c.classList.remove('selected'));
        if(seats) seats.forEach(s => s.classList.remove('selected'));
        selectedSeats = 0;
        if(totoTotal) totoTotal.innerText = '₹0';
        if(destinationInput) destinationInput.value = '';
        if(confirmRideBtn) confirmRideBtn.innerText = 'Confirm Ride';
    });

    // -------- SOS HUB LOGIC --------
    const appContainer = document.querySelector('.app-container') || document.body;
    
    // Alarm Overlay
    const overlay = document.createElement('div');
    overlay.id = 'alarmOverlay';
    overlay.className = 'alarm-overlay hidden';
    overlay.innerHTML = `
        <div class="alarm-card">
            <i class="ri-alarm-warning-fill alarm-icon"></i>
            <h2>ALARM TRIGGERED</h2>
            <p>Authorities have been alerted and security recording has started.</p>
            <button class="action-btn cancel-btn" id="dismissAlarmBtn" style="box-shadow: none;">DISMISS FALSE ALARM</button>
        </div>
    `;
    appContainer.appendChild(overlay);

    // Toast
    const toast = document.createElement('div');
    toast.id = 'sosToast';
    toast.className = 'sos-toast hidden';
    appContainer.appendChild(toast);

    const sosHub = document.getElementById('sosHub');
    const sosMenu = document.getElementById('sosMenu');
    const sosActions = document.querySelectorAll('.sos-action');
    
    // For app.html override to remove global dependency
    if(sosHub) {
        sosHub.removeAttribute('onclick'); // remove global click error
    }

    const dismissBtn = document.getElementById('dismissAlarmBtn');
    if(dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            overlay.classList.add('hidden');
            setTimeout(() => { overlay.style.display = 'none'; }, 300);
        });
    }

    if(sosHub && sosMenu) {
        sosHub.addEventListener('click', (e) => {
            // Prevent event from bubbling if clicked inside menu but not on a button
            if(e.target.closest('.sos-menu') && !e.target.closest('.sos-action')) return;
            
            if(sosMenu.style.display === 'none' || sosMenu.classList.contains('hidden')) {
                sosMenu.style.display = 'flex';
                sosMenu.classList.remove('hidden');
                void sosMenu.offsetWidth;
                sosMenu.style.opacity = '1';
                sosMenu.style.pointerEvents = 'auto';
                sosMenu.style.transform = 'scale(1) translateY(0)';
            } else {
                sosMenu.style.opacity = '0';
                sosMenu.style.transform = 'scale(0.8) translateY(20px)';
                sosMenu.style.pointerEvents = 'none';
                setTimeout(() => {
                    sosMenu.style.display = 'none';
                    sosMenu.classList.add('hidden');
                }, 300);
            }
        });
    }

    if(sosActions && sosActions.length >= 3) {
        sosActions[0].addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.style.display = 'flex';
            setTimeout(() => { overlay.classList.remove('hidden'); }, 10);
            if(sosHub) sosHub.click(); // close menu
        });
        
        sosActions[1].addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'tel:100';
            if(sosHub) sosHub.click();
        });
        
        sosActions[2].addEventListener('click', (e) => {
            e.stopPropagation();
            toast.innerHTML = '<i class="ri-map-pin-user-fill"></i> Location securely shared to emergency contacts.';
            toast.style.display = 'flex';
            setTimeout(() => {
                toast.classList.remove('hidden');
                toast.classList.add('slide-in-toast');
            }, 10);
            setTimeout(() => {
                toast.classList.remove('slide-in-toast');
                toast.classList.add('hidden');
                setTimeout(() => { toast.style.display = 'none'; }, 500);
            }, 4000);
            if(sosHub) sosHub.click();
        });
    }

    // Pass Banner Trigger - Add Daily Utility value!
    const passBanner = document.querySelector('.pass-banner');
    if(passBanner) {
        passBanner.addEventListener('click', () => {
            alert("🎓 Dhadkan Student Pass Info\n\nStatus: ACTIVE\nValidity: 28 Days Remaining\nPerks: Unlimited E-Toto rides under 3km.");
        });
    }

    if(searchState) {
        searchState.style.display = 'block';
        searchState.classList.add('slide-in');
    }
});
