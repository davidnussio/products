import {assign, createMachine} from 'xstate'
import {MutableRefObject} from 'react'
import {isEqual, isEmpty, remove} from 'lodash'
import type {LessonResource, Viewer} from '@skillrecordings/types'

export type VideoEvent =
  | {type: 'VOLUME_CHANGE'; volume: number; source?: string}
  | {type: 'SET_ROOT_ELEM'; rootElemRef: MutableRefObject<HTMLElement | null>}
  | {
      type: 'SET_CUE_FORM_ELEM'
      cueFormElemRef: MutableRefObject<HTMLFormElement | null>
    }
  | {type: 'LOADED'}
  | {type: 'REGISTER'; videoRef: MutableRefObject<HTMLVideoElement>}
  | {type: 'LOAD_RESOURCE'; resource: LessonResource}
  | {type: 'TAKE_NOTE'; source?: string}
  | {type: 'PLAY'; source?: string}
  | {type: 'TOGGLE_MUTE'}
  | {type: 'TOGGLE_FULLSCREEN'; element?: HTMLElement | null}
  | {type: 'EXIT_FULLSCREEN'; element?: HTMLElement | null}
  | {type: 'TOGGLE_SIDE_PANEL'}
  | {type: 'SEEKING'; seekingTime: number; source?: string}
  | {type: 'END_SEEKING'}
  | {type: 'TIMING'}
  | {type: 'ACTIVITY'}
  | {type: 'PAUSE'; source?: string}
  | {type: 'END'}
  | {type: 'PLAYBACKRATE_CHANGE'; playbackRate: number; source?: string}
  | {type: 'WAITING'}
  | {type: 'DONE_WAITING'}
  | {type: 'ACTIVATE_METADATA_TRACK'; track: TextTrack}
  | {type: 'CLEAR_METADATA_TRACKS'}
  | {type: 'ACTIVATE_CUE'; cue: VTTCue}
  | {type: 'DEACTIVATE_CUE'; cue: VTTCue}
  | {type: 'CLEAR_CUES'}
  | {type: 'TOGGLE_MUTE_CUES'}
  | {type: 'FOCUS_CUE_INPUT'}
  | {type: 'FAIL'}
  | {type: 'WRITE'; source?: string}
  | {type: 'WRITING'; source?: string}
  | {type: 'CANCEL'}
  | {type: 'SUBMITTED'; cue: VTTCue}
  | {type: 'CHANGE'}
  | {type: 'DONE_SUBMITTING_NOTE'}
  | {type: 'CANCELLED'}
  | {type: 'TOGGLE_CUE_STATE'; visibility: string}
  | {type: 'STARTED_TYPING'}

export interface VideoStateContext {
  rootElemRef: MutableRefObject<HTMLElement | null> | null
  cueFormElemRef: MutableRefObject<HTMLFormElement | null> | null
  // using a ref object versus the straight instance provided some
  // stability with the HLS Source. When it was the video element
  // HLS would get destroyed and recreated repeatedly
  videoRef: MutableRefObject<HTMLVideoElement> | undefined
  resource: LessonResource
  viewer: Viewer
  duration: number
  currentTime: number
  seekingTime: undefined | number
  hasStarted: boolean
  isActive: boolean
  readyState: number
  volume: number
  playbackRate: number
  isFullscreen: boolean
  withSidePanel: boolean
  lastAction: string | undefined
  waiting: boolean
  seeking: boolean
  metadataTracks: TextTrack[]
  activeCues: VTTCue[]
  cuesMuted: boolean
  writingCueNote: boolean
  isSubmittingCueNote: boolean
  writingCueNoteVisibility: string
}

export const videoMachine = createMachine<VideoStateContext, VideoEvent>(
  {
    id: 'videoMachine',
    initial: 'loading',
    context: {
      resource: {} as LessonResource,
      viewer: {} as Viewer,
      rootElemRef: null,
      cueFormElemRef: null,
      videoRef: undefined,
      waiting: true,
      duration: 0,
      currentTime: 0,
      seekingTime: undefined,
      hasStarted: false,
      isActive: false,
      readyState: 0,
      volume: 0.8,
      playbackRate: 1,
      isFullscreen: false,
      withSidePanel: true,
      lastAction: undefined,
      seeking: false,
      metadataTracks: [],
      activeCues: [],
      cuesMuted: false,
      writingCueNote: false,
      isSubmittingCueNote: false,
      writingCueNoteVisibility: 'draft',
    },
    on: {
      SET_ROOT_ELEM: {
        actions: assign({
          rootElemRef: (_context, event) => event.rootElemRef,
        }),
      },
      SET_CUE_FORM_ELEM: {
        actions: assign({
          cueFormElemRef: (_context, event) => event.cueFormElemRef,
        }),
      },
      REGISTER: {
        actions: [
          assign({
            videoRef: (_context, event) => event.videoRef,
            readyState: (_context, event) =>
              event.videoRef?.current?.readyState ?? 0,
          }),
        ],
      },
      WAITING: {
        actions: [
          assign({
            waiting: (_context, _event) => true,
          }),
        ],
      },
      WRITE: {
        actions: [
          assign({
            writingCueNote: (context, _event) => !context.writingCueNote,
          }),
        ],
      },
      DONE_WAITING: {
        actions: [
          assign({
            waiting: (_context, _event) => false,
          }),
        ],
      },
      ACTIVITY: {
        actions: [
          assign({
            isActive: (_context, _event) => true,
          }),
        ],
      },
      TOGGLE_FULLSCREEN: {
        actions: [
          assign({
            isFullscreen: (context, _event) => !context.isFullscreen,
          }),
          'toggleFullscreen',
        ],
      },
      EXIT_FULLSCREEN: {
        actions: [
          assign({
            isFullscreen: (context) => false,
          }),
        ],
      },
      TOGGLE_SIDE_PANEL: {
        actions: [
          assign({
            withSidePanel: (context, _event) => !context.withSidePanel,
          }),
        ],
      },
      CLEAR_METADATA_TRACKS: {
        actions: [
          assign({
            metadataTracks: (_context, _event) => [],
            activeCues: (_context, _event) => [],
          }),
        ],
      },
      ACTIVATE_METADATA_TRACK: {
        actions: [
          assign({
            metadataTracks: (context, event) => {
              event.track.mode = 'showing'
              if (context.metadataTracks.indexOf(event.track) < 0) {
                context.metadataTracks.push(event.track)
              }
              return [...context.metadataTracks]
            },
          }),
        ],
      },
      ACTIVATE_CUE: {
        actions: [
          assign({
            activeCues: (_context, event) => {
              // return context.activeCues.includes(event.cue)
              //   ? context.activeCues
              //   : [...context.activeCues, event.cue]

              //TODO: Gracefully handle multiple active cues
              return [event.cue]
            },
          }),
        ],
      },
      DEACTIVATE_CUE: {
        actions: [
          assign({
            activeCues: (context, event) => {
              remove(context.activeCues, (cue) => {
                return isEqual(event.cue, cue)
              })
              return [...context.activeCues]
            },
          }),
        ],
      },
      CLEAR_CUES: {
        actions: [
          assign({
            activeCues: (_context, _event) => [],
          }),
        ],
      },
      TOGGLE_MUTE_CUES: {
        actions: [
          assign({
            cuesMuted: (context, _event) => !context.cuesMuted,
          }),
        ],
      },
      TOGGLE_CUE_STATE: {
        actions: [
          // TODO: Save user preference
          assign({
            writingCueNoteVisibility: (_context, event) => event.visibility,
          }),
        ],
      },
      SEEKING: {
        actions: [
          assign({
            seekingTime: (context, event) => event.seekingTime,
            currentTime: (_context, event) => event.seekingTime,
            seeking: (_context, _event) => true,
            hasStarted: (_context, _event) => true,
          }),
          'seekVideo',
        ],
      },
      END_SEEKING: {
        actions: [
          assign({
            seekingTime: (context, event) => 0,
            seeking: (_context, _event) => false,
          }),
        ],
      },
    },
    states: {
      loading: {
        invoke: {
          src: 'loadViewer',
        },
        entry: [
          assign({
            waiting: (_context, _event) => true,
          }),
        ],
        on: {
          LOAD_RESOURCE: {
            actions: assign({
              resource: (_context, event) => event.resource,
            }),
          },
          LOADED: {
            target: 'ready',
            cond: {
              type: 'resourceLoaded',
            },
            actions: assign({
              readyState: (context, _event) =>
                context.videoRef?.current?.readyState ?? 0,
              waiting: (_context, _event) => false,
            }),
          },
          FAIL: 'failure',
        },
      },
      ready: {
        initial: 'paused',
        entry: [
          assign({
            waiting: (_context, _event) => false,
            isSubmittingCueNote: (_context, _event) => false,
          }),
        ],
        on: {
          TAKE_NOTE: {
            target: 'taking_note',
          },
          VOLUME_CHANGE: {
            actions: [
              assign({
                volume: (_context, event) => event.volume,
              }),
              'setVolume',
            ],
          },

          TOGGLE_MUTE: {
            actions: ['toggleMute'],
          },
          PLAYBACKRATE_CHANGE: {
            actions: [
              assign({
                playbackRate: (_context, event) => event.playbackRate,
              }),
              'setPlaybackRate',
            ],
          },
        },
        states: {
          paused: {
            on: {
              PLAY: {
                target: 'playing',
                actions: [
                  assign({
                    hasStarted: (_context, _event) => true,
                    lastAction: (_context, _event) => 'PLAY',
                  }),
                  'playVideo',
                ],
              },
            },
          },
          playing: {
            entry: [
              assign({
                waiting: (_context, _event) => false,
              }),
            ],
            on: {
              PAUSE: {
                target: 'paused',
                actions: [
                  'pauseVideo',
                  assign({
                    lastAction: (_context, _event) => 'PAUSE',
                  }),
                ],
              },
              TIMING: {
                actions: assign({
                  currentTime: (context, _event) =>
                    context.videoRef?.current?.currentTime ?? 0,
                  duration: (context, _event) =>
                    context.videoRef?.current?.duration ?? 0,
                }),
              },
              END: 'ended',
            },
          },
          ended: {
            entry: ['onVideoEnded'],
            on: {PLAY: 'playing'},
          },
        },
      },
      taking_note: {
        initial: 'focused',
        on: {
          SUBMITTED: {
            target: 'taking_note.submitting',
            actions: [
              assign({
                isSubmittingCueNote: (_context, _event) => true,
                metadataTracks: (context, event) => {
                  context.metadataTracks[0].addCue(event.cue)
                  return context.metadataTracks
                },
                hasStarted: (_context, _event) => true,
              }),
            ],
          },
          DONE_SUBMITTING_NOTE: [
            {
              target: 'ready.playing',
              actions: [
                assign({
                  isSubmittingCueNote: (_context, _event) => false,
                  hasStarted: (_context, _event) => true,
                }),
                'playVideo',
              ],
              cond: (context, event) => context.lastAction === 'PLAY',
            },
            {
              target: 'ready',
              actions: [
                assign({
                  isSubmittingCueNote: (_context, _event) => false,
                }),
              ],
              cond: (context) => context.lastAction !== 'PLAY',
            },
          ],
          FAIL: {
            target: 'taking_note.failure',
            actions: [
              assign({
                isSubmittingCueNote: (_context, _event) => false,
              }),
            ],
          },
          CANCELLED: {
            target: 'ready',
          },
        },
        states: {
          focused: {
            on: {
              CHANGE: {
                target: 'typing',
              },
            },
          },
          typing: {
            entry: ['pauseVideo'],
          },
          submitting: {
            invoke: {
              src: 'addCueNote',
              autoForward: true,
              onDone: {
                actions: [
                  assign({
                    isSubmittingCueNote: (_context, _event) => false,
                  }),
                ],
              },
            },
          },
          failure: {},
        },
      },
      failure: {
        entry: [
          assign({
            waiting: (_context, _event) => true,
          }),
        ],
      },
    },
  },
  {
    guards: {
      resourceLoaded: (context, _event) => {
        return !isEmpty(context.resource)
      },
    },
  },
)
