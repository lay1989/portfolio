/** Text controls bind to the shared shell; visual values remain design tokens. */
module.exports = [
    ['displayName','Brand label','Identity',80],
    ['ownerName','Owner name','Identity',120],
    ['footerDescription','Footer introduction','Footer',500],
    ['location','Location','Footer',180],
    ['exploreLabel','Navigation heading','Footer',60],
    ['footerContactLabel','Contact heading','Footer',60],
    ['copyrightName','Copyright name','Footer',120],
    ['backToTop','Back to top label','Footer',80],
    ['contactLabel','Header contact button','Contact links',60],
    ['mobileContactLabel','Mobile contact link','Contact links',60],
].map(([key,label,group,limit])=>({key,label,group,limit,type:'text',multiline:key==='footerDescription'}));
