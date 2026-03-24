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
    const backBtn = document.querySelector('.back-btn');
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

    if(searchWrapper) searchWrapper.addEventListener('click', (e) => {
        if(e.target.tagName.toLowerCase() === 'input') return; // Prevent panel transition if typing in input
        if(bgLayer) bgLayer.classList.add('zoom-bg');
        switchState([searchState], landmarksState);
    });

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

    let socket = null;
    try {
        socket = io("http://localhost:3000");
    } catch(err) {
        console.warn("WebSocket server not detected, using simulation mode.");
    }

    // Listen for real-time dispatch matching!
    if(socket) {
        socket.on('ride_accepted', (data) => {
            console.log("✅ LIVE MATCH! Driver accepted.", data);
            
            // Dynamically update UI with actual real-world driver details
            const dName = document.querySelector('.d-info h4');
            const dDetails = document.querySelector('.d-info p');
            const dAvatar = document.querySelector('.d-avatar');
            
            if(dName) dName.innerText = data.driverName || "Driver";
            if(dDetails) dDetails.innerText = `${data.rating}★ • ${data.vehicleNumber}`;
            if(dAvatar && data.driverAvatar) dAvatar.innerHTML = `<img src="${data.driverAvatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            
            // Shift screen instantly
            switchState([searchState, vehiclesState, totoSeatsState, landmarksState], activeRideState);
        });
    }

    if(confirmRideBtn) confirmRideBtn.addEventListener('click', () => {
        if(!selectedVehicle) return;
        
        if(selectedVehicle === 'toto') {
            switchState([vehiclesState], totoSeatsState);
        } else {
            if(socket && socket.connected) {
                confirmRideBtn.innerText = "Broadcasting to Drivers...";
                socket.emit('request_ride', {
                    destination: currentDest,
                    fare: selectedVehicle === 'bike' ? 45 : 150,
                    vehicle: selectedVehicle
                });
                // Note: We don't advance the screen until driver explicitly accepts
            } else {
                switchState([vehiclesState], activeRideState); // Fallback
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
        if(socket && socket.connected) {
            bookTotoBtn.innerText = "Pinging E-Totos...";
            socket.emit('request_ride', {
                destination: currentDest,
                fare: selectedSeats * 15,
                vehicle: 'toto',
                seats: selectedSeats
            });
        } else {
            switchState([totoSeatsState], activeRideState);
        }
    });

    if(backBtn) backBtn.addEventListener('click', () => switchState([totoSeatsState], vehiclesState));

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

    if(searchState) {
        searchState.style.display = 'block';
        searchState.classList.add('slide-in');
    }
});
