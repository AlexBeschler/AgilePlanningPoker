/*jshint esversion: 8 */
(function () {
    window.addEventListener('load', function (event) {
        Vue.createApp({
            data() {
                return {
                    // Global
                    db: null,
                    roomID: '',

                    // View-related
                    roomCreated: false,
                    showLoading: true,
                    isRoomAdmin: true,
                    
                    // Metadata-related
                    currentPack: 0,
                    revealed: false,

                    // Room-related
                    participants: null,
                    participantID: '',

                    // Front-end -related
                    cardSelection: '',
                    totalsText: '(Hidden)',
                    packs: [{
                            id: 0,
                            title: 'Fibonacci',
                            data: [
                                '1',
                                '2',
                                '3',
                                '5',
                                '8',
                                '13'
                            ]
                        },
                        {
                            id: 1,
                            title: 'Point-value',
                            data: [
                                '0.25',
                                '0.5',
                                '0.75',
                                '1',
                                '1.25',
                                '1.5',
                                '1.75',
                                '2'
                            ]
                        },
                        {
                            id: 2,
                            title: 'T-shirt',
                            data: [
                                'XS',
                                'S',
                                'M',
                                'L',
                                'XL',
                                'XXL'
                            ]
                        },
                        {
                            id: 3,
                            title: 'Linear',
                            data: [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5'
                            ]
                        }
                    ],
                    //Google Drive anonymous names
                    participantNames: [
                        "Alligator",
                        "Anteater",
                        "Armadillo",
                        "Axolotl",
                        "Badger",
                        "Bat",
                        "Beaver",
                        "Buffalo",
                        "Camel",
                        "Capybara",
                        "Chameleon",
                        "Cheetah",
                        "Chinchilla",
                        "Chipmunk",
                        "Chupacabra",
                        "Coyote",
                        "Crow",
                        "Dingo",
                        "Dinosaur",
                        "Dolphin",
                        "Duck",
                        "Elephant",
                        "Ferret",
                        "Fox",
                        "Frog",
                        "Giraffe",
                        "Gopher",
                        "Grizzly",
                        "Hedgehog",
                        "Hippo",
                        "Hyena",
                        "Iguana",
                        "Jackal",
                        "Kangaroo",
                        "Koala",
                        "Kraken",
                        "Lemur",
                        "Leopard",
                        "Llama",
                        "Manatee",
                        "Mink",
                        "Moose",
                        "Narwhal",
                        "Otter",
                        "Panda",
                        "Penguin",
                        "Platypus",
                        "Python",
                        "Rabbit",
                        "Raccoon",
                        "Rhino",
                        "Sheep",
                        "Skunk",
                        "Squirrel",
                        "Tiger",
                        "Turtle",
                        "Walrus",
                        "Wolf",
                        "Wolverine",
                        "Wombat"
                    ]
                };
            },
            created() {
                this.db = firebase.firestore();
                this.joinRoom();
                window.addEventListener('beforeunload', this.unmountRoom);
            },
            mounted() {
                this.showLoading = false;
            },
            watch: {
                revealed() {
                    if (this.revealed) {
                        var hi = 0;
                        var lo = 99;

                        if (this.currentPack == 0) {
                            // Calculate totals
                            var total = 0;
                            var average = 0;

                            var self = this;
                            var voteValues = [];
                            Object.keys(this.participants).forEach(function(key) {
                                var selection = parseInt(self.participants[key].selection);
                                voteValues.push(selection);
                                if (selection > hi) {
                                    hi = selection;
                                }
                                if (selection < lo) {
                                    lo = selection;
                                }
                                total += selection;
                            });

                            average = total / Object.keys(this.participants).length;

                            this.totalsText = 'High: ' + hi + '; Low: ' + lo + '; Average: ' + average + ', \u03C3=' + self.getStandardDeviation(voteValues);
                        } else {
                            this.totalsText = 'Scoring not available';
                        }
                    } else {
                        this.totalsText = '(Hidden)';
                        for (var j = 0; j < this.$refs.pokerCards.length; j++) {
                            this.$refs.pokerCards[j].childNodes[0].classList.remove('selected');
                        }
                    }

                    anime({
                        targets: this.$refs.headerText,
                        translateY: ['-50%', '0%'],
                        opacity: [0, 1],
                        duration: 250,
                        easing: 'easeInOutQuad'
                    });
                }
            },
            methods: {
                unmountRoom() {
                    //Let this code complete before allowing page to close
                    /*
                    this.db.collection('rooms').doc(this.roomID).delete().then(() => {
                        console.log('Closed room');
                        this.db.collection('metadata').doc(this.roomID).delete().then(() => {
                            console.log('Closed metadata');
                        }).catch((error) => {
                            console.error(error);
                        });
                    }).catch((error) => {
                        console.error(error);
                    });
                    */
                },

                async createRoom() {
                    this.$refs.createRoomButton.disabled = true;
                    this.roomID = _.toString(uuidv4());
                    //Firebase doc ID is the room ID
                    //Field name is the participant ID
                    const name = this.getRandomParticipantName();
                    const avatarURL = this.getAvatarFromName(name);
                    const participantID = _.toString(uuidv4()); 
                    this.participantID = participantID;
                    const participant = {
                        participantID: participantID,
                        name: name,
                        selection: '',
                        avatarURL: avatarURL
                    };
                    const room = {
                        [participantID]: participant
                    };

                    try {
                        await this.db.collection('rooms').doc(this.roomID).set(room);
                    } catch(error) {
                        console.error(error);
                    }

                    try {
                        await this.db.collection('metadata').doc(this.roomID).set({
                            currentPack: 0,
                            revealed: false
                        });
                    } catch(error) {
                        console.error(error);
                    }

                    this.listenRoom();

                    this.roomCreated = true;

                    this.$refs.copyInput.value = 'https://agile-planning-poker-c0fea.firebaseapp.com/index.html?' + this.roomID;
                    this.copyTextToClipboard('https://agile-planning-poker-c0fea.firebaseapp.com/index.html?' + this.roomID);
                    var copyModal = new bootstrap.Modal(this.$refs.copyToClipboardModal);
                    this.$refs.copyToClipboardModal.addEventListener('shown.bs.modal', () => {
                        this.$refs.copyInput.focus();
                    });
                    copyModal.toggle();
                },

                joinRoom() {
                    var self = this;
                    var u = _.toString(window.location.href);
                    var params = u.split('?');
                    if (params.length < 2) {
                        //User has not joined a room
                        return;
                    }

                    //User joined room
                    this.roomID = params[1];

                    this.isRoomAdmin = false;
                    this.roomCreated = true;

                    //Set listener
                    this.listenRoom();

                    //Get current room data
                    var docRef = this.db.collection('rooms').doc(this.roomID);
                    return this.db.runTransaction((transaction) => {
                        return transaction.get(docRef).then((doc) => {
                            if (!doc.exists) {
                                new bootstrap.Modal(this.$refs.closedByAdminModal).toggle();
                                throw 'Document does not exist!';
                            }

                            const pID = _.toString(uuidv4());
                            var participant = null;
                            //Check to see if the user previously connected to the room
                            if (self.getLocalStorage(self.roomID) === null) {
                                //The user has not joined this room before
                                self.setLocalStorage(self.roomID, pID); //Set local storage so we can connect again if need be
                                //Make a new participant
                                const myName = self.getRandomParticipantName();
                                const avatarURL = self.getAvatarFromName(myName);
                                participant = {
                                    participantID: pID,
                                    name: myName,
                                    selection: '',
                                    avatarURL: avatarURL
                                };
                                self.participantID = pID;
                                
                                transaction.update(docRef, {
                                    [pID]: participant
                                });
                                return self.participants;
                            } else {
                                //The user has joined this room before, don't create a new participant
                                //TODO:
                                //self.participantID = self.getLocalStorage(self.roomID);
                            }
                        });
                    }).then(() => {
                        console.log('Transaction successful!');
                    }).catch((error) => {
                        console.error('Transaction failed: ', error);
                    });
                },
                listenRoom() {
                    this.db.collection('rooms').doc(this.roomID).onSnapshot((doc) => {
                        if (!doc.exists) {
                            //Room has been closed by admin
                            new bootstrap.Modal(this.$refs.closedByAdminModal).toggle();
                        } else {
                            this.participants = doc.data();
                            console.log('Participant room list changed');
                        }
                    });

                    this.db.collection('metadata').doc(this.roomID).onSnapshot((doc) => {
                        if (!doc.exists) {
                            //Room has been closed by admin
                            new bootstrap.Modal(this.$refs.closedByAdminModal).toggle();
                        } else {
                            this.currentPack = doc.data().currentPack;
                            this.revealed = doc.data().revealed;
                            console.log('metadata/{' + this.roomID + '} updated');
                        }
                    });
                },
                changeCardPack(pack) {
                    var docRef = this.db.collection('metadata').doc(this.roomID);
                    try {
                        return docRef.update({
                            currentPack: pack.id
                        });
                    } catch(error) {
                        console.error(error);
                    }
                },
                clickedPokerCard(val, index) {
                    // Update front end to reflect the clicked poker card
                    
                    // Remove any clicked poker cards
                    for (var j = 0; j < this.$refs.pokerCards.length; j++) {
                        this.$refs.pokerCards[j].childNodes[0].classList.remove('selected');
                    }
                    // Find clicked poker card and add 'selected' class
                    this.$refs.pokerCards[index].childNodes[0].classList.add('selected');

                    // Run Firebase transaction
                    var self = this;
                    var docRef = this.db.collection('rooms').doc(this.roomID);
                    return this.db.runTransaction((transaction) => {
                        return transaction.get(docRef).then((doc) => {
                            if (!doc.exists) {
                                throw 'Document does not exist!';
                            }

                            const field = self.participantID + '.selection';
                            
                            transaction.update(docRef, {
                                [field]: val
                            });
                            return;
                        });
                    }).then(() => {
                        console.log('Transaction successful!');
                    }).catch((error) => {
                        console.error('Transaction failed: ', error);
                    });
                },
                checkForSelection(val) {
                    return {
                        'selected': val === this.cardSelection ? true : false
                    };
                },
                async reveal() {
                    this.$refs.headerText.style.opacity = 0;

                    //Change cloud 'revealed' variable from false to true
                    var docRef = this.db.collection('metadata').doc(this.roomID);

                    try {
                        await docRef.update({
                            revealed: true
                        });
                    } catch(error) {
                        console.error(error);
                    }

                    // Remove 'selected' class from clicked poker card
                    for (var j = 0; j < this.$refs.pokerCards.length; j++) {
                        this.$refs.pokerCards[j].childNodes[0].classList.remove('selected');
                    }
                },
                async reset() {
                    //Reset everyone's selection
                    for (var j = 0; j < this.$refs.pokerCards.length; j++) {
                        this.$refs.pokerCards[j].childNodes[0].classList.remove('selected');
                    }

                    this.totalsText = '(Hidden)';

                    try {
                        await this.db.collection('metadata').doc(this.roomID).update({
                            revealed: false
                        });
                    } catch(error) {
                        console.error(error);
                    }
                    
                    //Get current room data
                    var docRef = this.db.collection('rooms').doc(this.roomID);
                    return this.db.runTransaction((transaction) => {
                        return transaction.get(docRef).then((doc) => {
                            if (!doc.exists) {
                                throw 'Document does not exist!';
                            }

                            var updateParticipants = doc.data();

                            Object.keys(updateParticipants).forEach(function(key){ 
                                updateParticipants[key].selection = '';
                            });
                            transaction.update(docRef, updateParticipants);
                            return;
                        });
                    }).then(() => {
                        console.log('Transaction successful!');
                    }).catch((error) => {
                        console.error('Transaction failed: ', error);
                    });
                },

                //Utils
                copyTextToClipboard(text) {
                    if (!navigator.clipboard) {
                        var textArea = document.createElement("textarea");
                        textArea.value = text;

                        // Avoid scrolling to bottom
                        textArea.style.top = "0";
                        textArea.style.left = "0";
                        textArea.style.position = "fixed";

                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();

                        try {
                            var successful = document.execCommand('copy');
                            var msg = successful ? 'successful' : 'unsuccessful';
                            console.log('Fallback: Copying text command was ' + msg);
                        } catch (err) {
                            console.error('Fallback copy error', err);
                        }

                        document.body.removeChild(textArea);
                        return;
                    }
                    navigator.clipboard.writeText(text).then(function () {
                        //Success
                    }, function (err) {
                        console.error('Async: Could not copy text: ', err);
                    });
                },
                getRandomParticipantName() {
                    var min = Math.ceil(0);
                    var max = Math.floor(this.participantNames.length);
                    return this.participantNames[Math.floor(Math.random() * (max - min) + min)]; //The maximum is exclusive and the minimum is inclusive
                },
                getAvatarFromName(participant) {
                    return 'https://agile-planning-poker-c0fea.firebaseapp.com/assets/avatars/' + participant + '.png';
                },
                getLocalStorage(key) {
                    var storage = window.localStorage;
                    return storage.getItem(key);
                },
                setLocalStorage(key, value) {
                    var storage = window.localStorage;
                    storage.setItem(key, value);
                },
                getStandardDeviation(array) {
                    const n = array.length;
                    const mean = array.reduce((a, b) => a + b) / n;
                    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n).toFixed(3);
                }
            }
        }).mount('#app');
    });
})();