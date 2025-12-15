import { hpMN, hpMN8 } from './hangingprotocols/hpMNGrid';
import hpMNCompare from './hangingprotocols/hpCompare';
import hpMammography from './hangingprotocols/hpMammo';
import hpScale from './hangingprotocols/hpScale';

// Default protocol - starts with 1x1 layout
// Layout can be changed via postMessage from parent window
const defaultProtocol = {
  id: 'default',
  locked: true,
  name: 'Default',
  createdDate: '2021-02-23T19:22:08.894Z',
  modifiedDate: '2023-04-01',
  availableTo: {},
  editableBy: {},
  protocolMatchingRules: [],
  toolGroupIds: ['default'],
  numberOfPriorsReferenced: 0,
  defaultViewport: {
    viewportOptions: {
      viewportType: 'stack',
      toolGroupId: 'default',
      allowUnmatchedView: true,
      syncGroups: [
        {
          type: 'hydrateseg',
          id: 'sameFORId',
          source: true,
          target: true,
          options: {
            matchingRules: ['sameFOR'],
          },
        },
      ],
    },
    displaySets: [
      {
        id: 'defaultDisplaySetId',
        matchedDisplaySetsIndex: -1,
      },
    ],
  },
  displaySetSelectors: {
    defaultDisplaySetId: {
      seriesMatchingRules: [
        {
          weight: 10,
          attribute: 'numImageFrames',
          constraint: {
            greaterThan: { value: 0 },
          },
        },
        {
          attribute: 'isDisplaySetFromUrl',
          weight: 20,
          constraint: {
            equals: true,
          },
        },
      ],
    },
  },
  stages: [
    {
      name: 'default',
      viewportStructure: {
        layoutType: 'grid',
        properties: {
          rows: 1,
          columns: 1,
        },
      },
      viewports: [
        {
          viewportOptions: {
            viewportType: 'stack',
            viewportId: 'default',
            toolGroupId: 'default',
            initialImageOptions: {
              custom: 'sopInstanceLocation',
            },
            syncGroups: [
              {
                type: 'hydrateseg',
                id: 'sameFORId',
                source: true,
                target: true,
              },
            ],
          },
          displaySets: [
            {
              id: 'defaultDisplaySetId',
            },
          ],
        },
      ],
      createdDate: '2021-02-23T18:32:42.850Z',
    },
  ],
};

function getHangingProtocolModule() {
  return [
    {
      name: defaultProtocol.id,
      protocol: defaultProtocol,
    },
    {
      name: hpMNCompare.id,
      protocol: hpMNCompare,
    },
    {
      name: hpMammography.id,
      protocol: hpMammography,
    },
    {
      name: hpScale.id,
      protocol: hpScale,
    },
    {
      name: hpMN.id,
      protocol: hpMN,
    },
    {
      name: hpMN8.id,
      protocol: hpMN8,
    },
  ];
}

export default getHangingProtocolModule;

