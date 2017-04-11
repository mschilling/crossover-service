'use strict';

const moment = require('moment');
const api = require('../../lib/crossover-api');

const ref = api.getFirebaseRef();

const imageBaseUrl = 'https://image.tmdb.org/t/p/w454_and_h254_bestv2';

const LIST_ID = 1; // 1=Marvel, 2=DC

let episodes = [];

function loadSerieEpisodes(serieId) {
  return ref.child(`data_series/${serieId}`).once('value').then((serieSnapshot) => {

    const s = serieSnapshot.val();

    return ref.child(`data_episodes/${serieId}`)
      // .limitToLast(2)
      .once('value', (episodesSnapshot) => {

        return episodesSnapshot.forEach((episodeSnapshot) => {
          const e = episodeSnapshot.val();
          // console.log(e);

          const item = {
            id: e.id,
            aired: moment(e.air_date).format(),
            title: e.name,
            overview: e.overview,
            season: e.season_number,
            episode: e.episode_number,
            serieId: s.id,
            serieName: s.name,
            picture: e.still_path ? `${imageBaseUrl}${e.still_path}` : `${imageBaseUrl}${s.backdrop_path}`,
          }

          episodes.push(item);
        })

      })
      ;

  })
}

function loadSeriesEpisodes(series) {
  const items = series || [];
  const actions = items.map(loadSerieEpisodes);
  return Promise.all(actions);
}

const result = [];
let path;
let series;

switch(LIST_ID) {
  case 1:
    path = 'timelines/marvel';
    series = [
      api.Constants.Series.daredevil,
      api.Constants.Series.jessicaJones,
      api.Constants.Series.lukeCage,
      api.Constants.Series.ironFist];
    break;
  case 2:
    path = 'timelines/dc';
    series = [
      api.Constants.Series.arrow,
      api.Constants.Series.legendsDC,
      api.Constants.Series.flash,
      api.Constants.Series.supergirl];
    break;
}

Promise.resolve()

  .then(() => {
    episodes = [];
    return true;
  })

  .then(() => loadSeriesEpisodes(series))

  .then(() => ref.child(path).remove())

  .then(() => {
    episodes.sort((a, b) => {
      const key1 = moment(a.aired).toISOString() + '-' + (1000 + a.season) + '-' + (1000 + a.episode);
      const key2 = moment(b.aired).toISOString() + '-' + (1000 + b.season) + '-' + (1000 + b.episode);
      return key1 > key2 ? 1 : -1;
    });

    // const timelineRef = ref.child(path);
    const items = episodes || [];

    const actions = items.map((item) => saveToTimeline(item, path));
    Promise.all(actions).then(() => console.log('done updating'));

  });

function saveToTimeline(obj, refPath = 'user_timelines/michael/dc') {
  return ref.child(refPath).push(obj);
}
