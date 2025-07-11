import { Agent } from '@atproto/api'
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react'
import { useEffect, useState } from 'react'

import { classNames } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

type TypeaheadResult = {
  did: string
  handle: string
  avatar?: string
  displayName?: string
}

type RepoFinderProps = {
  selectionType?: 'did' | 'handle'
  onChange: (value: string) => void
  clearOnSelect?: boolean
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  getProfiles?: (labelerAgent: Agent, q: string) => Promise<TypeaheadResult[]>
}

const DefaultResult = {
  did: '',
  handle: 'DID or Handle',
  displayName: 'Start typing to search...',
}

const ErrorResult = {
  did: '',
  handle: 'Error searching',
  displayName: 'Start typing to search...',
}

const getProfilesForQuery = async (
  agent: Agent,
  q: string,
): Promise<TypeaheadResult[]> => {
  if (q.startsWith('did:')) {
    const { data: profile } = await agent.app.gndr.actor.getProfile({
      actor: q,
    })

    return profile
      ? [
          {
            displayName: profile.displayName,
            handle: profile.handle,
            avatar: profile.avatar,
            did: profile.did,
          },
        ]
      : []
  }

  const {
    data: { actors },
  } = await agent.app.bsky.actor.searchActorsTypeahead({ q })

  return actors.map((actor) => ({
    displayName: actor.displayName,
    handle: actor.handle,
    avatar: actor.avatar,
    did: actor.did,
  }))
}

export function RepoFinder({
  selectionType = 'did',
  onChange,
  clearOnSelect = false,
  inputProps = {},
  getProfiles = getProfilesForQuery,
}: RepoFinderProps) {
  const [query, setQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [items, setItems] = useState<TypeaheadResult[]>([DefaultResult])
  const [loading, setLoading] = useState(false)
  const labelerAgent = useLabelerAgent()

  useEffect(() => {
    if (query.length > 0) {
      setLoading(true)
      getProfiles(labelerAgent, query)
        .then((profiles) => {
          setItems(profiles)
          setLoading(false)
        })
        .catch((error) => {
          console.error('Error fetching data:', error)
          setLoading(false)
          setItems([ErrorResult])
        })
    } else {
      setItems([DefaultResult])
    }
  }, [labelerAgent, query, getProfiles])

  return (
    <Combobox
      value={selectedItem}
      onChange={(item) => {
        setSelectedItem(clearOnSelect ? '' : item || '')
        onChange(item || '')
      }}
    >
      <ComboboxInput
        // This is intentionally spread on top so that any of the below props are passed via inputProps, they are ignored
        // This also helps with the classname overwrite
        {...inputProps}
        className={classNames(
          'rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm disabled:text-gray-500 dark:text-gray-100 disabled:dark:text-gray-300',
          inputProps.className,
        )}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <ComboboxOptions className="rounded mt-1 max-h-60 overflow-y-auto bg-gray-100 dark:bg-slate-900 shadow-sm">
        {loading ? (
          <div className="p-2">Loading...</div>
        ) : items.length === 0 && query !== '' ? (
          <div className="p-2">
            <div className="font-semibold text-sm">No results found</div>
            <div className="text-sm">
              Queries must be partial handle or full DIDs
            </div>
          </div>
        ) : (
          items.map((item) => (
            <ComboboxOption
              key={item.did}
              value={selectionType === 'did' ? item.did : item.handle}
              className={({ focus }) =>
                `cursor-pointer p-2 flex items-center space-x-3 ${
                  focus ? 'bg-gray-400 text-white dark:bg-slate-700' : ''
                }`
              }
            >
              <img
                alt={item.displayName || item.handle}
                className="h-7 w-7 rounded-full"
                src={item.avatar || '/img/default-avatar.jpg'}
              />
              <div>
                <div className="font-semibold text-sm">@{item.handle}</div>
                <div className="text-sm">
                  {item.displayName || 'No display name'}
                </div>
              </div>
            </ComboboxOption>
          ))
        )}
      </ComboboxOptions>
    </Combobox>
  )
}
