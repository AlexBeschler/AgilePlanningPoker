/*jshint esversion: 8 */
(function () {
    window.addEventListener('load', function (event) {
        Vue.createApp({
            data() {
                return {
                    db: null,
                    roomCreated: false,
                    showLoading: true,
                    roomID: '',
                    isRoomAdmin: true,
                    participants: [],
                    participantID: '',
                    currentPack: 0,
                    revealed: false,
                    revealButtonText: 'Reveal',
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
            },
            mounted() {
                this.showLoading = false;
            },
            destroy() {
                //remove user from room
            },
            watch: {
                revealed() {
                    var self = this;
                    if (self.revealed) {
                        if (self.currentPack == 0) {
                            //Calculate totals
                            var hi = 0;
                            var lo = 99;
                            var total = 0;
                            var avg = 0;

                            self.participants.forEach(p => {
                                var c = parseInt(p.selection);
                                if (c > hi) {
                                    hi = c;
                                }
                                if (c < lo) {
                                    lo = c;
                                }
                                total += c;
                            });

                            avg = total / self.participants.length;

                            self.totalsText = 'Hi: ' + hi + '; Lo: ' + lo + '; Avg: ' + avg;
                        } else {
                            self.totalsText = 'Scoring not available';
                        }
                    } else {
                        self.totalsText = '(Hidden)';
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
                createRoom() {
                    var self = this;
                    this.$refs.createRoomButton.disabled = true;
                    var docID = _.toString(uuidv4());
                    var room = {
                        docID: docID,
                        participants: [],
                        currentPack: 0,
                        revealed: false
                    };
                    this.db.collection('rooms').doc(docID).set(room)
                        .then(() => {
                            self.roomID = room.docID;
                            self.listenRoom();
                            var name = self.getRandomParticipantName();
                            var avatarURL = self.getAvatarFromName(name);
                            //Make a new participant
                            var participant = {
                                participantID: _.toString(uuidv4()),
                                name: name,
                                selection: '',
                                avatarURL: avatarURL
                            };
                            self.participantID = participant.participantID;
                            self.participants.push(participant);
                            self.db.collection('rooms').doc(self.roomID).update({
                                participants: self.participants
                            }).catch((error) => {
                                console.error(error);
                            });
                            self.roomCreated = true;
                            self.$refs.copyInput.value = 'https://agile-planning-poker-c0fea.firebaseapp.com/index.html?' + room.docID;
                            self.copyTextToClipboard('https://agile-planning-poker-c0fea.firebaseapp.com/index.html?' + room.docID);
                            var copyModal = new bootstrap.Modal(this.$refs.copyToClipboardModal);
                            self.$refs.copyToClipboardModal.addEventListener('shown.bs.modal', () => {
                                self.$refs.copyInput.focus();
                            });
                            copyModal.toggle();
                        })
                        .catch((error) => {
                            console.error(error);
                        });
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
                                throw 'Document does not exist!';
                            }

                            self.currentPack = doc.data().currentPack;
                            self.participants = doc.data().participants;
                            self.revealed = doc.data().revealed;
                            var pID = _.toString(uuidv4());
                            var participant = null;
                            //Check to see if the user previously connected to the room
                            if (self.getLocalStorage(self.roomID) === null) {
                                //The user has not joined this room before
                                self.setLocalStorage(self.roomID, pID); //Set local storage so we can connect again if need be
                                //Make a new participant
                                var name = self.getRandomParticipantName();
                                var avatarURL = self.getAvatarFromName(name);
                                participant = {
                                    participantID: pID,
                                    name: name,
                                    selection: '',
                                    avatarURL: avatarURL
                                };
                                self.participants.push(participant);
                                self.participantID = pID;
                                transaction.update(docRef, {
                                    participants: self.participants
                                });
                                return self.participants;
                            } else {
                                //The user has joined this room before, don't create a new participant
                                self.participantID = self.getLocalStorage(self.roomID);
                            }
                        });
                    }).then(() => {
                        console.log('Transaction successful!');
                    }).catch((error) => {
                        console.error('Transaction failed: ', error);
                    });
                },
                listenRoom() {
                    var self = this;
                    this.db.collection('rooms').doc(this.roomID).onSnapshot((doc) => {
                        self.currentPack = doc.data().currentPack;
                        self.revealed = doc.data().revealed;
                        //Find out what participant change occurred
                        //Loop thru server copy of participant list
                        doc.data().participants.forEach(participant => {
                            //Find corresponding participant
                            var id = _.findIndex(self.participants, function (o) {
                                return o.participantID == participant.participantID;
                            });
                            if (id === -1) {
                                //User was newly added
                                console.log('Added ' + participant.name);
                                self.participants.push(participant);
                            } else {
                                if (self.participants[id].selection !== participant.selection) {
                                    //Someone made a selection change
                                    console.log(participant.name + ' changed their selection');
                                    self.participants[id].selection = participant.selection;
                                }
                            }
                        });
                        self.participants = doc.data().participants;

                    });
                },
                changeCardPack(pack) {
                    var self = this;
                    this.currentPack = pack.id;

                    //Get current room data
                    var docRef = this.db.collection('rooms').doc(this.roomID);
                    return this.db.runTransaction((transaction) => {
                        return transaction.get(docRef).then((doc) => {
                            if (!doc.exists) {
                                throw 'Document does not exist!';
                            }

                            transaction.update(docRef, {
                                currentPack: self.currentPack
                            });
                            return self.currentPack;
                        });
                    }).then(() => {
                        console.log('Transaction successful!');
                    }).catch((error) => {
                        console.error('Transaction failed: ', error);
                    });
                },
                clickedPokerCard(val) {
                    var changeIndex = 0;
                    for (var i = 0; i < this.participants.length; i++) {
                        if (this.participants[i].participantID === this.participantID) {
                            changeIndex = i;
                            this.participants[i].selection = val;
                            break;
                        }
                    }
                    var docRef = this.db.collection('rooms').doc(this.roomID);
                    return this.db.runTransaction((transaction) => {
                        return transaction.get(docRef).then((doc) => {
                            if (!doc.exists) {
                                throw 'Document does not exist!';
                            }

                            var p = doc.data().participants;
                            p[changeIndex].selection = val;
                            transaction.update(docRef, {
                                participants: p
                            });
                            return p;
                        });
                    }).then(() => {
                        console.log('Transaction successful!');
                    }).catch((error) => {
                        console.error('Transaction failed: ', error);
                    });
                },
                reveal() {
                    var self = this;
                    this.$refs.headerText.style.opacity = 0;

                    //Get current room data
                    var docRef = this.db.collection('rooms').doc(this.roomID);
                    return this.db.runTransaction((transaction) => {
                        return transaction.get(docRef).then((doc) => {
                            if (!doc.exists) {
                                throw 'Document does not exist!';
                            }
                            if (self.revealed) {
                                self.revealButtonText = 'Reveal';
                                self.revealed = false;
                                transaction.update(docRef, {
                                    revealed: false
                                });
                                return self.revealed;
                            } else {
                                self.revealButtonText = 'Hide';
                                self.revealed = true;
                                transaction.update(docRef, {
                                    revealed: true
                                });
                                return self.revealed;
                            }
                        });
                    }).then(() => {
                        console.log('Transaction successful!');
                    }).catch((error) => {
                        console.error('Transaction failed: ', error);
                    });
                },
                reset() {
                    var self = this;
                    //Reset everyone's selection
                    this.participants.forEach(element => {
                        element.selection = '';
                    });
                    //Hide numbers
                    this.revealed = false;
                    this.revealButtonText = 'Reveal';
                    this.totalsText = '(Hidden)';
                    //Get current room data
                    var docRef = this.db.collection('rooms').doc(this.roomID);
                    return this.db.runTransaction((transaction) => {
                        return transaction.get(docRef).then((doc) => {
                            if (!doc.exists) {
                                throw 'Document does not exist!';
                            }
                            var update = {
                                revealed: false,
                                participants: self.participants
                            };
                            transaction.update(docRef, update);
                            return update;
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
                }
            }
        }).mount('#app');
    });
})();