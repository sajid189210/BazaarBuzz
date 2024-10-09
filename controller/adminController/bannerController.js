const Banner = require('../../model/bannerModel');
// import { Carousel } from 'tw-elements';

// (async () => {
//     const { initTWE } = await import('tw-elements');
//     initTWE({
//         Carousel: {
//             interval: 3000,
//             keyboard: true,
//             indicators: true,
//             controls: true,
//             pauseOnHover: true,
//             rewind: true,
//             fade: false,
//         },
//     });
// })();

//* render the banner page.
const getBannerPage = (req, res) => {
    try {

        res.render('admin/homeBanner');

    } catch (err) {

    }
};

module.exports = {
    getBannerPage,
}