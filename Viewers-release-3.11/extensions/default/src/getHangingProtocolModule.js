import { hpMN, hpMN8 } from './hangingprotocols/hpMNGrid';
import hpMNCompare from './hangingprotocols/hpCompare';
import hpMammography from './hangingprotocols/hpMammo';
import hpScale from './hangingprotocols/hpScale';
// ... existing imports at top ...

// Create a responsive default protocol generator
const defaultProtocolGenerator = ({ servicesManager }) => {
  // Check if screen is "large" (e.g., >= 1024px width)
  const isLargeScreen = window.innerWidth >= 1024;
  
  const rows = isLargeScreen ? 2 : 1;
  const columns = isLargeScreen ? 2 : 1;
  
  // Build viewports array based on layout
  const viewports = [];
  const totalViewports = rows * columns;
  
  for (let i = 0; i < totalViewports; i++) {
    viewports.push({
      viewportOptions: {
        viewportType: 'stack',
        viewportId: i === 0 ? 'default' : `viewport-${i + 1}`,
        toolGroupId: 'default',
        allowUnmatchedView: i > 0,
        ...(i === 0 && {
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
        }),
      },
      displaySets: [
        {
          id: 'defaultDisplaySetId',
          ...(i > 0 && { matchedDisplaySetsIndex: -1 }),
        },
      ],
    });
  }

  return {
    protocol: {
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
              rows,
              columns,
            },
          },
          viewports,
          createdDate: '2021-02-23T18:32:42.850Z',
        },
      ],
    },
  };
};

function getHangingProtocolModule() {
  return [
    {
      name: 'default',
      protocol: defaultProtocolGenerator, // Use the generator instead of static protocol
    },
    // ... rest of your protocols (hpMNCompare, hpMammography, etc.) ...
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

