// @ts-nocheck
// from covizu team
import { timeDay } from 'd3-time';

import { Clusters } from '../custom/types';

// regular expression to remove redundant sequence name components
const pat = /^hCoV-19\/(.+\/.+)\/20[0-9]{2}$/gi;
const { unique, mode, tabulate, merge_tables, utcDate } = require('./utils');

import { getData } from '../custom/fetchData';

// Tom Thomson - autumn birches 1916
var province_pal = {
  'British Columbia': '#254617',
  Alberta: '#557332',
  Saskatchewan: '#5D776A',
  Manitoba: '#7E7327',
  Ontario: '#DB8433',
  Quebec: '#9E3C2A',

  'Newfoundland and Labrador': '#094074',
  'New Brunswick': '#441151',
  'Nova Scotia': '#B10F2E',
  'Prince Edward Island': '#087E8B',

  Nunavut: '#B29F7D',
  Yukon: '#904C77',
  'Northwest Territories': '#C98BB9',
};

/**
 * Parse nodes that belong to the same variant.
 * A variant is a collection of genomes that are indistinguishable with respect to
 * (1) differences from the reference or (2) placement in the phylogenetic tree.
 * Visually, the variant is represented by a horizontal line segment spanning the
 * sample collection dates.
 * The samples that comprise a variant are gathered by collection date into "points"
 * along the horizontal line.  If there are no samples, then the variant is
 * "unsampled" and spans the entire width of the beadplot.
 *
 * @param {Object} variant:  associative list member of cluster.nodes
 * @param {number} y:  vertical position
 * @param {number} cidx:  cluster index for labeling points
 * @param {string} accn:  accession of baseline sample of variant
 * @param {Date} mindate:  used only for unsampled variants
 * @param {Date} maxdate:  used only for unsampled variants
 * @returns {{variants: [], points: []}}
 */
function parse_variant(variant, y, cidx, accn, mindate, maxdate) {
  var vdata,
    pdata = [];

  if (variant.length === 0) {
    // handle unsampled internal node
    if (mindate === null || maxdate === null) {
      // this would happen if a cluster comprised only one unsampled node - should be impossible!
      console.log(
        'Error in parse_variants(): cannot draw unsampled variant without min and max dates',
      );
    }
    vdata = {
      accession: accn,
      label: accn, // unsampled variant has no meaningful label
      x1: utcDate(mindate), // cluster min date
      x2: utcDate(maxdate), // cluster max date
      y1: y,
      y2: y,
      count: 0,
      country: null,
      region: null,
      numBeads: 0,
      parent: null,
      dist: 0,
      unsampled: true,
    };
  } else {
    // parse samples within variant, i.e., "beads"
    // coldate, division, country, region, accession, name
    var label =
        variant[0][2] === variant[0][1]
          ? variant[0][1] + '/' + variant[0][4].replace(pat, '$1')
          : variant[0][2] + '/' + variant[0][1] + '/' + variant[0][4].replace(pat, '$1'), //Issue #323: avoid double tagging
      coldates = variant.map((x) => x[0]),
      isodate,
      samples;

    coldates.sort();
    //Retrieving countries from variants?
    var country = variant.map((x) => x[2]),
      regions = variant.map((x) => x[3]),
      divisions = variant.map((x) => x[1]),
      isodates = unique(coldates);

    vdata = {
      accession: accn,
      label: label,
      x1: utcDate(coldates[0]), // min date
      x2: utcDate(coldates[coldates.length - 1]), // max date
      y1: y,
      y2: y,
      count: coldates.length,
      division: tabulate(divisions),
      country: tabulate(country),
      region: regions,
      c2r: map_country_to_region(country, regions),
      numBeads: isodates.length,
      parent: null,
      dist: 0,
      unsampled: false,
    };

    for (var i = 0; i < isodates.length; i++) {
      isodate = isodates[i];
      samples = variant.filter((x) => x[0] === isodate);
      divisions = samples.map((x) => x[1]);
      country = samples.map((x) => x[2]);
      regions = samples.map((x) => x[3]);

      let provinces = divisions.filter((x) => Object.keys(province_pal).includes(x));

      pdata.push({
        cidx,
        variant: accn,
        x: utcDate(isodate),
        y: y,
        count: samples.length,
        accessions: samples.map((x) => x[4]),
        labels: samples.map((x) =>
          x[2] === x[1]
            ? x[1] + '/' + x[4].replace(pat, '$1')
            : x[2] + '/' + x[1] + '/' + x[4].replace(pat, '$1'),
        ), // Issue #323
        region1: mode(regions),
        region: regions,
        country: tabulate(country),
        division: tabulate(divisions),
        division1: mode(provinces),
        c2r: map_country_to_region(country, regions),
        parent: null,
        dist: 0,
      });
    }
  }

  return { variant: vdata, points: pdata };
}

/**
 *
 * @param cluster
 * @param variants
 * @param points
 * @returns {[]}
 */
const parse_edgelist = (cluster, variants, points) => {
  // map earliest collection date of child node to vertical edges
  let edge,
    parent,
    child,
    dist,
    support,
    edgelist = [];

  // generate maps of variants and points keyed by accession
  let lookup_variant = {};
  variants.forEach(function (row) {
    lookup_variant[row.accession] = row;
  });

  let lookup_points = {},
    index_points = {}; // index by y-coordinate

  points.forEach(function (pt) {
    if (lookup_points[pt.variant] === undefined) {
      lookup_points[pt.variant] = [];
    }
    lookup_points[pt.variant].push(pt);
    if (index_points[pt.y] === undefined) {
      index_points[pt.y] = [];
    }
    index_points[pt.y].push(pt);
  });

  for (var e = 0; e < cluster.edges.length; e++) {
    edge = cluster.edges[e];
    //parent = variants.filter(x => x.accession === edge[0])[0];
    parent = lookup_variant[edge[0]];
    //child = variants.filter(x => x.accession === edge[1])[0];
    child = lookup_variant[edge[1]];

    if (parent === undefined || child === undefined) {
      // TODO: handle edge to unsampled node
      continue;
    }

    dist = parseFloat(edge[2]);
    if (edge[3] === null) {
      support = undefined;
    } else {
      support = parseFloat(edge[3]);
    }

    edgelist.push({
      y1: parent.y1,
      y2: child.y1,
      x1: child.x1, // vertical line segment
      x2: child.x1,
      parent: parent.label,
      child: child.label,
      dist: dist,
      support: support,
    });

    child.parent = parent.label;
    child.dist = dist;

    // Assign the parent and genomic distance of each point
    if (index_points[child.y1] !== undefined) {
      for (let pt of index_points[child.y1]) {
        pt.parent = parent.label;
        pt.dist = dist;
      }
    }
    /*
    for (let c = 0; c < points.length; c++) {
      if (points[c].y === child.y1) {
        points[c].parent = parent.label;
        points[c].dist = dist;
      }
    }
    */

    // update variant time range
    if (parent.x1 > child.x1) {
      parent.x1 = child.x1;
    }
    if (parent.x2 < child.x1) {
      parent.x2 = child.x1;
    }
  }
  return edgelist;
};

/**
 * Parse node and edge data from clusters JSON to a format that is
 * easier to map to SVG.
 * @param {Object} clusters:
 */
async function parse_clusters(clusters) {
  var cluster,
    variant,
    coldates,
    regions,
    labels,
    accn,
    mindate,
    maxdate,
    result,
    vdata,
    pdata,
    variants, // horizontal line segment data + labels
    edgelist, // vertical line segment data
    points, // the "beads"
    beaddata = []; // return value

  for (const cidx in clusters) {
    cluster = clusters[cidx];

    variants = [];
    points = [];
    edgelist = [];

    // deal with edge case of cluster with only one variant, no edges
    if (Object.keys(cluster['nodes']).length === 1) {
      variant = Object.values(cluster.nodes)[0];
      accn = Object.keys(cluster.nodes)[0];
      result = parse_variant(variant, 0, cidx, accn, null, null);
      vdata = result['variant'];
      variants.push(vdata);

      pdata = result['points'];
      points = points.concat(pdata);
    } else {
      // de-convolute edge list to get node list in preorder
      var nodelist = unique(cluster.edges.map((x) => x.slice(0, 2)).flat());

      // date range of cluster
      coldates = nodelist.map((a) => cluster.nodes[a].map((x) => x[0])).flat();
      coldates.sort();
      mindate = coldates[0];
      maxdate = coldates[coldates.length - 1];

      // extract the date range for each variant in cluster
      var y = 1;
      for (const accn of nodelist) {
        // extract collection dates for all samples of this variant
        variant = cluster.nodes[accn];
        result = parse_variant(variant, y, cidx, accn, mindate, maxdate);
        variants.push(result['variant']);
        points = points.concat(result['points']);
        y++;
      }

      edgelist = parse_edgelist(cluster, variants, points);
    }

    beaddata.push({
      variants: variants,
      edgelist: edgelist,
      points: points,
    });

    // calculate consensus region for cluster
    // collect all region Arrays for all samples, all variants
    regions = points.map((x) => x.region).flat();
    cluster['region'] = mode(regions);
    cluster['allregions'] = tabulate(regions);

    // concatenate all sample labels within cluster for searching
    labels = points.map((x) => x.labels).flat();

    // decompose labels and only keep unique substrings
    let uniq = new Set(labels.map((x) => x.split('/')).flat());
    cluster['searchtext'] = Array.from(uniq).join();
    cluster['label1'] = labels[0];

    // collect all countries
    cluster['country'] = merge_tables(variants.map((x) => x.country));
    cluster['division'] = merge_tables(
      variants.map((x) => x.division).filter((x) => x !== undefined),
    );
    let province_counts = Object.keys(province_pal).map((x) => {
      let pcount = cluster['division'][x];
      if (pcount === undefined) {
        return 0;
      } else {
        return pcount;
      }
    });
    let which_max = province_counts.indexOf(province_counts.reduce((a, b) => (a > b ? a : b)));
    cluster['province'] = which_max > 0 ? Object.keys(province_pal)[which_max] : null;

    cluster['c2r'] = merge_maps(variants.map((x) => x.c2r).filter((x) => x !== undefined));
  }
  return beaddata;
}

/**
 * Map cluster information to tips of the tree.
 * @param {Array} df: data frame extracted from time-scaled tree
 * @param {Array} clusters: data from clusters JSON
 * @returns {Array} subset of data frame annotated with cluster data
 */
async function map_clusters_to_tips(df, clusters) {
  // extract accession numbers from phylogeny data frame
  var tips = df.filter((x) => x.children.length === 0),
    tip_labels = tips.map((x) => x.thisLabel), // accessions
    tip_stats;

  for (const cidx in clusters) {
    var cluster = clusters[cidx];
    if (cluster['nodes'].length === 1) {
      continue;
    }

    // find variant in cluster that matches a tip label
    var labels = Object.keys(cluster['nodes']),
      root = tip_labels.filter((value) => value === cluster['lineage'])[0];
    if (root === undefined) {
      console.log('Failed to match cluster of index ', cidx, ' to a tip in the tree');
      continue;
    }

    var root_idx = tip_labels.indexOf(root), // row index in data frame
      root_xcoord = tips[root_idx].x; // left side of cluster starts at end of tip

    // find most recent sample collection date
    var coldates = Array(),
      label,
      variant;

    for (var i = 0; i < labels.length; i++) {
      label = labels[i];
      variant = cluster['nodes'][label];
      coldates = coldates.concat(variant.map((x) => x[0]));
    }
    coldates.sort(); // in place, ascending order

    var first_date = utcDate(coldates[0]),
      last_date = utcDate(coldates[coldates.length - 1]);

    // Calculate the mean collection date
    let date_diffs = coldates.map((x) => timeDay.count(first_date, utcDate(x))),
      mean_date = Math.round(date_diffs.reduce((a, b) => a + b, 0) / date_diffs.length);

    // augment data frame with cluster data
    tips[root_idx].cluster_idx = cidx;
    tips[root_idx].region = cluster.region;
    tips[root_idx].allregions = cluster.allregions;
    tips[root_idx].country = cluster.country;
    tips[root_idx].c2r = cluster.c2r;
    tips[root_idx].division = cluster.division;
    tips[root_idx].province = cluster.province;
    tips[root_idx].searchtext = cluster.searchtext;
    tips[root_idx].label1 = cluster['lineage'];
    tips[root_idx].count = coldates.length;
    tips[root_idx].varcount = cluster['sampled_variants']; // Number for sampled variants
    tips[root_idx].sampled_varcount = labels.filter(
      (x) => x.substring(0, 9) !== 'unsampled',
    ).length;
    tips[root_idx].first_date = first_date;
    tips[root_idx].last_date = last_date;
    tips[root_idx].pdist = cluster.pdist;
    tips[root_idx].rdist = cluster.rdist;

    tips[root_idx].coldate = last_date;
    tips[root_idx].x1 = root_xcoord - (last_date - first_date) / 3.154e10;
    tips[root_idx].x2 = root_xcoord;

    // map dbstats for lineage to tip
    const dbstats = await getData('dbstats');
    tip_stats = dbstats['lineages'][cluster['lineage']];
    tips[root_idx].max_ndiffs = tip_stats.max_ndiffs;
    tips[root_idx].mean_ndiffs = tip_stats.mean_ndiffs;
    tips[root_idx].nsamples = tip_stats.nsamples;
    tips[root_idx].mutations = tip_stats.mutations;

    // calculate residual from mean differences and mean collection date - fixes #241
    let times = coldates.map((x) => utcDate(x).getTime()),
      origin = 18231, // days between 2019-12-01 and UNIX epoch (1970-01-01)
      mean_time = times.reduce((x, y) => x + y) / times.length / 8.64e7 - origin,
      rate = 0.0655342, // subs per genome per day
      exp_diffs = rate * mean_time; // expected number of differences
    tips[root_idx].residual = tip_stats.mean_ndiffs - exp_diffs; // tip_stats.residual;
    tips[root_idx].mcoldate = timeDay.offset(first_date, mean_date);
  }
  return tips;
}

/**
 * Populate Object with accession-cluster ID as key-value pairs.
 * Note, this also provides a list (via Object.keys()) of all
 * accession numbers for autocompleting search queries.
 *
 * @param {Object} clusters:  contents of clusters JSON
 * @returns {{}}
 */
async function index_accessions(clusters) {
  var index = {};
  for (const cid in clusters) {
    var accns = Object.entries(clusters[cid].nodes)
      .map((x) => x[1])
      .flat()
      .map((x) => x[1]);
    for (const accn of accns) {
      index[accn] = cid;
    }
  }
  return index;
}

async function index_lineage(clusters: Clusters) {
  var index = {};
  for (const cid in clusters) {
    var accns = clusters[cid].lineage;
    index[accns] = cid;
  }
  return index;
}

function merge_maps(maps) {
  var total = {};
  for (let m of maps) {
    // e.g., {'Canada': {'North America': 65}, 'USA': {'North America': 1}}
    if (m === null) {
      continue;
    }
    for (let key of Object.keys(m)) {
      // 'Canada'
      if (total[key] === undefined) {
        total[key] = {};
      }
      for (let subkey of Object.keys(m[key])) {
        if (total[key][subkey] === undefined) {
          total[key][subkey] = 0;
        }
        total[key][subkey] += m[key][subkey];
      }
    }
  }
  return total;
}

/**
 * Generate a map of country to region (continent).  In case of discordant region,
 * track all cases.
 * @param country
 * @param regions
 * @returns {{}}
 */
function map_country_to_region(country: string, regions: any) {
  // Compile map of country to region
  let c2r = {},
    ci,
    ri;
  for (let i = 0; i < country.length; i++) {
    ci = country[i];
    ri = regions[i];
    if (ci in c2r) {
      if (ri in c2r[ci]) {
        c2r[ci][ri] += 1;
      } else {
        c2r[ci][ri] = 1;
      }
    } else {
      c2r[ci] = {};
      c2r[ci][ri] = 1;
    }
  }
  return c2r;
}

export { index_accessions, index_lineage, map_clusters_to_tips, parse_clusters };
