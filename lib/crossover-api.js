var firebase = require('firebase').initializeApp({
  serviceAccount: "./service-account.json",
  databaseURL: "https://crossover-app.firebaseio.com"
});

const mdb = require('moviedb')('3d83d16d940769a016e95db174a201e2');
const ref = firebase.database().ref();

const endPoints = {
  users: 'users',
  series: 'series',
  lists: 'lists',
  listSeries: 'list_series',
  userLists: 'user_lists',
  userTimelines: 'user_timelines',
  userTimelineItems: 'user_timeline_items'
};

function getFirebaseRef() {
  return ref;
}

function seedLists() {
  let listsRef = getFirebaseRef().child(endPoints.lists);
  let items = [
    { name: 'DC' },
    { name: 'Marvel' }
  ];

  listsRef.remove()
    .then(() => getFirebaseRef().child(endPoints.listSeries).remove())
    .then(() => {

      items.forEach((item) => {
        listsRef.push(item).then((listSnapshot) => {
          let listRef;
          let listSeries = [];
          if (item.name == 'DC') {
            listRef = getFirebaseRef().child(endPoints.listSeries).child(listSnapshot.key);
            listSeries.push({ serieId: 1402 });
          }
          if (item.name == 'Marvel') {
            listRef = getFirebaseRef().child(endPoints.listSeries).child(listSnapshot.key);
            listSeries.push({ serieId: 1502 });
          }

          listRef.set(listSeries);

        });
      })

    })


}

// var snapshotMode = false;

// function FetchSerie(serieId) {
//   console.log('Fetching serie id ' + serieId);

//   let serieData = {};

//   getSerie(serieId)
//     .then((data) => {
//       serieData.serie = data;
//       // console.log(data);
//       return true;
//     })

//     .then(() => getSerieSeasonsEpisodes(serieId, serieData.serie.number_of_seasons))
//     .then((data) => {
//       // serieData.episodesRaw = data;
//       serieData.episodes = data.reduce(function (a, b) {
//         return a.concat(b.episodes);
//       }, []);

//       return data;
//     })
//     .then((episodes) => {
//       // console.log(episodes, 'done!');

//       if (snapshotMode) {
//         var key = new Date().getTime();
//         var seriesRef = ref.child(serieId + '-' + key);
//         seriesRef.set(serieData);
//       } else {
//         ref.child(serieId).set(serieData);
//       }

//       console.log('done!');
//     });
// }

function getSerie(serieId) {
  return new Promise(
    function (resolve, reject) {
      mdb.tvInfo({ id: serieId }, (err, res) => {
        if (err) {
          reject(Error(err));
        } else {
          resolve(res);
        }
      });
    }
  );
}

function getSerieSeasonEpisodes(serieId, seasonId) {
  // console.log(`Get series episodes; serie: ${serieId}, season: ${seasonId}`);
  return new Promise(
    function (resolve, reject) {
      mdb.tvSeasonInfo({ id: serieId, season_number: seasonId }, (err, res) => {
        if (err) {
          reject(Error(err));
        } else {
          resolve(res);
        }
      });
    }
  );
}

function getSerieEpisodes(serieId) {
  return getSerie(serieId).then((serie) => {
    const numberOfSeasons = serie.number_of_seasons;
    const seasons = [];
    const resultArray = [];

    for (let i = 1; i <= numberOfSeasons; i++) {
      seasons.push(i);
    }

    // Loop through our chapter urls
    return seasons.reduce(function (sequence, seasonNumber) {
      // console.log('sequence=' + sequence, 'seasonNumber=' + seasonNumber);
      // Add these actions to the end of the sequence
      return sequence.then(function () {
        return getSerieSeasonEpisodes(serieId, seasonNumber);
      }).then(function (response) {
        // console.log(response);
        // resultArray.push(response);
        resultArray.push(response);
      });
    }, Promise.resolve())
      .then(() => resultArray)
      .then((data) => {
        // serieData.episodesRaw = data;
        let result = data.reduce(function (a, b) {
          return a.concat(b.episodes);
        }, []);
        return result;
      });
  });
}

module.exports = {
  getFirebaseRef: getFirebaseRef,
  getSerie: getSerie,
  getSerieEpisodes: getSerieEpisodes,

  seedLists: seedLists,
};