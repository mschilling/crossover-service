function formatSeasonEpisode( season, episode ) {
  const formatSeason = ('0' + season).slice(-2);
  const formatEpisode = ('0' + episode).slice(-2);
  return `S${formatSeason}E${formatEpisode}`;
}

module.exports = {
  formatSeasonEpisode: formatSeasonEpisode
};
