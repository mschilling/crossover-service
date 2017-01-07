const moment = require('moment');
const api = require('./lib/crossover-api');
const ref = api.getFirebaseRef();

// var idWestworld = 63247;
// var idArrow = 1412;
// var idLegendsDC = 62643;
// var idFlash = 60735;
// var idVixen = 62125;
// var idSupergirl = 62688;

// api.seedLists();

// ref.child('users').set({placeholder: true})
// ref.child('user_timelines_items').set({placeholder: true})
// ref.child('timeline_items').set({placeholder: true})

// ref.child('source').remove();

ref.child('tasks').on('child_added', function (snapshot) {
  // console.log('refresh serie', snapshot.val());
  const task = snapshot.val();
  const taskRef = ref.child('tasks').child(snapshot.key);

  switch (task.name) {
    case 'fetch_serie':
      return fetchSerie(task.serie).then(() => taskRef.remove());
      break;
    case 'fetch_serie_episodes':
      return fetchSerieEpisodes(task.serie).then(() => taskRef.remove());
      break;
  }
})

// API below
function fetchSerie(serieId) {
  console.log('Fetch serie ' + serieId);
  return api.getSerie(serieId)
    .then((data) => saveSerie(serieId, data));
}

function fetchSerieEpisodes(serieId) {
  console.log('Fetch serie episodes ' + serieId);
  return api.getSerieEpisodes(serieId)
    .then((data) => saveSerieEpisodes(serieId, data));
}

function saveSerie(serieId, data) {
  console.log('Save serie ' + serieId);
  return ref.child('data_series').child(serieId).set(data);
}

function saveSerieEpisodes(serieId, data) {
  console.log('Save serie episodes ' + serieId);
  return ref.child('data_episodes').child(serieId).set(data);
}
