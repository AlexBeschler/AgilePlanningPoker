/*jshint esversion: 8 */
(function () {
    window.addEventListener('load', function (event) {
        Vue.createApp({
            data() {
                return {
                    timesClicked: 0
                };
            },
            created() {
                //
            },
            mounted() {
                //
            },
            destroy() {
                //remove user from room
            },
            methods: {
                clickButton() {
                    this.timesClicked++;
                }
            }
        }).mount('#app');
    });
})();