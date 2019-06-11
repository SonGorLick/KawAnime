export default {
  computed: {
    parsedName () {
      const parts = this.videoTitle.split(' - ')

      return {
        name: parts[0],
        ep: parts[1]
      }
    }
  },

  beforeDestroy () {
    const { name: refName, ep: refEp } = this.parsedName
    const { autoTracking } = this.$store.state.config.config
    const providersAutoTracking = Object.keys(autoTracking).reduce((acc, provider) => {
      return provider === 'local'
        ? acc
        : acc.concat(provider)
    }, [])

    this.$log(`Setting auto tracking for ${refName} - ${refEp}`)

    autoTracking.local && this.trackLocal(refName, refEp)
    providersAutoTracking.some(Boolean) && this.trackProviders(refName, refEp, providersAutoTracking)
  },

  methods: {
    trackLocal (refName, refEp) {
      // Finding entries with the same name
      const lists = this.$store.state.watchLists.lists
      const candidates = []

      Object.keys(lists).forEach((listName) => {
        const list = lists[listName]
        const _candidates = list.filter(({ name }) => name === refName)

        _candidates.forEach((c) => candidates.push(c))
      })

      // If there is no candidate, let's just leave it be
      if (!candidates.length) return

      candidates.forEach((entry) => {
        // The user might be rewatching an episode, we should check if he's seen more first
        const isRewatch = +entry.progress > refEp

        if (isRewatch) return

        // Updating progress accordingly
        this.$store.dispatch('watchLists/add', {
          ...entry,
          progress: +refEp
        })

        this.$log(`Updated user local progress for ${refName}.`)
      })
    },
    trackProviders (refName, refEp, providers) {
      providers.forEach((provider) => {
        const { list, isConnected } = this.$store.state.services[provider]

        if (!list || !isConnected) return

        const { id, progress } = list.filter(({ title }) => title === refName)[0]

        if (progress && +progress >= +refEp) return

        this.$store.dispatch('services/updateList', {
          service: provider,
          args: {
            isEdit: true,
            [provider === 'anilist' ? 'mediaId' : 'id']: id,
            data: { progress: +refEp },
            progress: +refEp
          }
        })

        this.$log(`Updated user's ${provider} progress on ${refName}.`)
      })
    }
  }
}
