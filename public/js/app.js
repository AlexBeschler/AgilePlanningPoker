/*jshint esversion: 8 */
(function () {
    Vue.createApp({
        data() {
            return {
                db: null,
                roomCreated: false,
                roomID: '',
                isRoomAdmin: true,
                participants: [],
                participantID: '',
                currentPack: 0,
                revealed: false,
                packs: [{
                        id: 0,
                        title: 'Fibonacci',
                        data: [
                            '1',
                            '2',
                            '3',
                            '5',
                            '8'
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
                    "Bear",
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
                    "Dog",
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
                    "Lion",
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
        destroy() {
            //remove user from room
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
                        self.copyTextToClipboard('https://agile-planning-poker-c0fea.firebaseapp.com/index.html?' + room.docID);
                        self.roomID = room.docID;
                        self.roomCreated = true;
                        self.listenRoom();
                        //Make a new participant
                        var participant = {
                            participantID: _.toString(uuidv4()),
                            name: self.getRandomParticipantName(),
                            selection: ''
                        };
                        self.participants.push(participant);
                        self.participantID = participant.participantID;
                        self.updateRoomDocument({
                            participants: self.participants
                        });
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
                this.db.collection('rooms').doc(this.roomID).get().then((doc) => {
                    if (doc.exists) {
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
                            participant = {
                                participantID: pID,
                                name: self.getRandomParticipantName(),
                                selection: ''
                            };
                            self.participants.push(participant);
                            self.participantID = pID;
                            self.updateRoomDocument({
                                participants: self.participants
                            });
                        } else {
                            //The user has joined this room before, don't create a new participant
                            self.participantID = self.getLocalStorage(self.roomID);
                        }
                    } else {
                        console.error('Room does not exist!');
                    }
                }).catch((error) => {
                    console.log("Error getting document:", error);
                });
            },
            listenRoom() {
                var self = this;
                this.db.collection('rooms').doc(this.roomID).onSnapshot((doc) => {
                    self.currentPack = doc.data().currentPack;
                    self.participants = doc.data().participants;
                    self.revealed = doc.data().revealed;
                });
            },
            changeCardPack(pack) {
                this.currentPack = pack.id;
                this.updateRoomDocument({
                    currentPack: pack.id
                });
            },
            clickedPokerCard(val) {
                for (var i = 0; i < this.participants.length; i++) {
                    if (this.participants[i].participantID === this.participantID) {
                        this.participants[i].selection = val;
                        break;
                    }
                }
                this.updateRoomDocument({
                    participants: this.participants
                });
            },
            reveal() {
                this.revealed = true;
                this.updateRoomDocument({
                    revealed: true
                });
            },
            reset() {
                this.participants.forEach(element => {
                    element.selection = '';
                });
                this.revealed = false;
                this.updateRoomDocument({
                    participants: this.participants,
                    revealed: false
                });
            },

            //Utils
            updateRoomDocument(update) {
                this.db.collection('rooms').doc(this.roomID).update(update).catch((error) => {
                    console.error(error);
                });
            },
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
})();