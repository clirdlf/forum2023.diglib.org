export default class {
 data(){return {redirects:[{from:'/affiliated-events/learnatdlf/',to:'/affiliated-events/learndlf/'},{from:'/resources/hotel-accommodations/',to:'/conference-venue-and-hotel/'}],pagination:{data:'redirects',size:1,alias:'redirect'},permalink:({redirect})=>redirect.from,eleventyExcludeFromCollections:true};}
 render({redirect}){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${redirect.to}"><link rel="canonical" href="https://forum2023.diglib.org${redirect.to}"><title>Page moved</title></head><body><a href="${redirect.to}">Continue to this page</a></body></html>`;}
}
