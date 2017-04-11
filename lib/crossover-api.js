const moment = require('moment');
const firebase = require('firebase').initializeApp({
  serviceAccount: './service-account.json',
  databaseURL: 'https://crossover-app.firebaseio.com'
});
const utils = require('../lib/utils');

const mdb = require('moviedb')('3d83d16d940769a016e95db174a201e2');
const ref = firebase.database().ref();

const tmdbImageBaseUrl = 'https://image.tmdb.org/t/p/w454_and_h254_bestv2';
const defaultUserId = 'anonymous';

const endPoints = {
  users: 'users',
  series: 'series',
  lists: 'lists',
  listSeries: 'list_series',
  userLists: 'user_lists',
  userTimelines: 'user_timelines'
};

const Series = {
  westworld: 63247,
  arrow: 1412,
  legendsDC: 62643,
  flash: 60735,
  vixen: 62125,
  supergirl: 62688,
  daredevil: 61889,
  jessicaJones: 38472,
  lukeCage: 62126,
  ironFist: 62127
};

function getFirebaseRef() {
  return ref;
}

function seedMarvelCrossoverList() {
  const obj = {
    id: 1,
    name: 'Marvel',
    series: [
      Series.daredevil,
      Series.jessicaJones,
      Series.lukeCage,
      Series.ironFist
    ]
  };
  return ref.child(endPoints.lists).child(obj.id).set(obj);
}

function seedDCCrossoverList() {
  const obj = {
    id: 2,
    name: 'DC',
    series: [
      Series.arrow,
      Series.legendsDC,
      Series.flash,
      Series.supergirl
    ]
  };
  return ref.child(endPoints.lists).child(obj.id).set(obj);
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
      });
    });
}

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

function saveToTimeline(obj, ref) {
  if (!ref) return Promise.reject('ref is null');

  return ref.push(obj);
}

// @return Firebase reference
function createOrUpdateUserList(userId, listObj, listKey) {
  if (!userId) return Promise.reject('userId is null');

  const userListRef = ref.child(endPoints.userLists).child(userId);

  if (listKey)
    return userListRef.child(listKey).set(listObj).then(() => userListRef.child(listKey));
  else
    return userListRef.push(listObj).then((snapshot) => snapshot.ref);
}

function loadSerieEpisodes(serieId, episodes = []) {
  return ref.child(`data_series/${serieId}`).once('value').then((serieSnapshot) => {
    const s = serieSnapshot.val();

    return ref.child(`data_episodes/${serieId}`)
      // .limitToLast(2)
      .once('value', (episodesSnapshot) => {
        return episodesSnapshot.forEach((episodeSnapshot) => {
          const e = episodeSnapshot.val();
          // console.log(e);

          let item = {
            id: e.id,
            aired: moment(e.air_date).format(),
            title: e.name,
            overview: e.overview,
            season: e.season_number,
            episode: e.episode_number,
            code: utils.formatSeasonEpisode(e.season_number, e.episode_number),
            serieId: s.id,
            serie: s.name,
            // obsolete
            serieName: s.name,
            picture: e.still_path ? `${tmdbImageBaseUrl}${e.still_path}` : `${tmdbImageBaseUrl}${s.backdrop_path}`,
          };

          episodes.push(item);
        });
      })
      ;
  });
}

function loadSeriesEpisodes(series = []) {
  console.log('Get Series Episodes', series);
  const items = series || [];
  const episodes = [];
  const actions = items.map((item) => loadSerieEpisodes(item, episodes));
  return Promise.all(actions).then(() => _sortTimelineItems(episodes));
}

function populateUserTimeline(userId, listId) {
  if (!userId || !listId) return Promise.reject('userId or listId is null');

  const listRef = ref.child(endPoints.userLists).child(userId).child(listId);
  const targetRef = ref.child(endPoints.userTimelines).child(userId).child(listId);
  return populateTimeline(listRef, targetRef);
}

function populateTimeline(sourceRef, targetRef) {
  console.log(`populateTimeline(${sourceRef.key}, ${targetRef.key}`);
  if (!targetRef) return Promise.reject('targetRef is null');

  return sourceRef.once('value').then((snapshot) => {
    const list = snapshot.val();
    console.log(list);

    return loadSeriesEpisodes(list.series)
      .then((episodes) => {
        const actions = episodes.map((obj) => saveToTimeline(obj, targetRef));
        return Promise.all(actions).then(() => console.log('done updating'));
      });
  });
}

function generateUserTimeline(userId = defaultUserId, listRef) {
  if (!listRef) return Promise.reject('listRef is null');

  return listRef.once('value').then((snapshot) => {
    const list = snapshot.val();
    return loadSeriesEpisodes(list.series)
      .then((episodes) => {
        const targetPath = `${endPoints.userTimelines}/${userId}/${snapshot.key}`;

        ref.child(targetPath).remove().then(() => {
          const actions = episodes.map((obj) => saveToTimeline(obj, ref.child(targetPath)));
          return Promise.all(actions).then(() => console.log('done generating user timeline'));
        });
      });
  });
}

function addTask(taskName, taskParams = {}) {
  const tasksRef = ref.child('tasks');

  switch (taskName) {
    case 'fetch_serie':
      const serieId = taskParams.serieId;
      return Promise.resolve()
        .then(() => tasksRef.push({ name: 'fetch_serie', serie: serieId, time: new Date().getTime() }))
        .then(() => tasksRef.push({ name: 'fetch_serie_episodes', serie: serieId, time: new Date().getTime() }))
        ;
      break;
    // case 'generate_timeline':
    //   if (taskParams.listId)
    //     return tasksRef.push({ name: 'generate_list', user: taskParams.userId, list: taskParams.listId, time: new Date().getTime() });
    //   else
    //     return tasksRef.push({ name: 'generate_user_list', user: taskParams.userId, list: taskParams.userListId, time: new Date().getTime() });
    //   break;
    case 'generate_user_timeline':
      return tasksRef.push({ name: 'generate_user_timeline', user: taskParams.userId, listRef: taskParams.listRef, time: new Date().getTime() });
      break;
  }
  return Promise.resolve();
}

function _sortTimelineItems(items = []) {
  return items.sort((a, b) => {
          return _getEpisodeKey(a) > _getEpisodeKey(b) ? 1 : -1;
  });
}

function _getEpisodeKey(episode) {
  if (!episode) return;

  return moment(episode.aired).toISOString() + '-'
    + (1000 + episode.season)
    + '-' + (1000 + episode.episode);
}

module.exports = {
  // consts / enums
  Constants: {
    Series: Series,
    EndPoints: endPoints
  },

  getFirebaseRef: getFirebaseRef,
  getSerie: getSerie,
  getSerieEpisodes: getSerieEpisodes,

  populateTimeline: populateTimeline,
  populateUserTimeline: populateUserTimeline,

  generateUserTimeline: generateUserTimeline,

  seedLists: seedLists,

  seedMarvelCrossoverList: seedMarvelCrossoverList,
  seedDCCrossoverList: seedDCCrossoverList,

  createOrUpdateUserList: createOrUpdateUserList,

  addTask: addTask,
};
