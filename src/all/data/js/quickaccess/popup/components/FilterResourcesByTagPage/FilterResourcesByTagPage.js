import PropTypes from "prop-types";
import React from "react";
import { withRouter } from "react-router";
import { Link } from "react-router-dom";
import AppContext from "../../contexts/AppContext";
import SimpleBar from "../SimpleBar/SimpleBar";

const BROWSED_RESOURCES_LIMIT = 500;
const BROWSED_TAGS_LIMIT = 500;

class FilterResourcesByTagPage extends React.Component {
  constructor(props) {
    super(props);
    this.initEventHandlers();
    this.initState();
  }

  componentDidMount() {
    this.context.focusSearch();
    if (this.context.searchHistory[this.props.location.pathname]) {
      this.context.updateSearch(this.context.searchHistory[this.props.location.pathname]);
    }

    // If a tag is selected, the component aims to display the resources marked by this tag.
    // Load the resources
    if (this.props.match.params.id) {
      this.findAndLoadResources();
    } else {
      // Otherwise list the tags the user has resources marked with.
      this.findAndLoadTags();
    }
  }

  initEventHandlers() {
    this.handleGoBackClick = this.handleGoBackClick.bind(this);
    this.handleSelectTagClick = this.handleSelectTagClick.bind(this);
    this.handleSelectResourceClick = this.handleSelectResourceClick.bind(this);
  }

  initState() {
    let selectedTag = null;

    // The selected tag to use to filter the resources is passed via the history.push state option.
    if (this.props.location.state && this.props.location.state.selectedTag) {
      selectedTag = this.props.location.state.selectedTag
    }

    this.state = {
      selectedTag: selectedTag,
      tags: null,
      resources: null
    };
  }

  handleGoBackClick(ev) {
    ev.preventDefault();
    // Clean the search and remove the search history related to this page.
    this.context.updateSearch("");
    delete this.context.searchHistory[this.props.location.pathname];
    this.props.history.goBack();
  }

  handleSelectTagClick(ev, tagId) {
    ev.preventDefault();
    this.context.searchHistory[this.props.location.pathname] = this.context.search;
    this.context.updateSearch("");
    // Push the tag as state of the component.
    const selectedTag = this.state.tags.find(tag => tag.id == tagId);
    this.props.history.push(`/data/quickaccess/resources/tag/${tagId}`, { selectedTag });
  }

  handleSelectResourceClick(ev, resourceId) {
    ev.preventDefault();
    // Add a search history for the current page.
    // It will allow the page to restore the search when the user will come back after clicking goBack (caveat, the workflow is not this one).
    // By instance when you select a tag that you have filtered you expect the page to be filtered as when you left it.
    this.context.searchHistory[this.props.location.pathname] = this.context.search;
    this.context.updateSearch("");
    this.props.history.push(`/data/quickaccess/resources/view/${resourceId}`);
  }

  async findAndLoadTags() {
    const tags = await passbolt.request("passbolt.tags.find-all");
    this.sortTagsAlphabetically(tags);
    this.setState({ tags });
  }

  async findAndLoadResources() {
    const filter = { hasTag: this.props.location.state.selectedTag.slug };
    const resources = await passbolt.request("passbolt.resources.find-all", { filter });
    this.sortResourcesAlphabetically(resources);
    this.setState({ resources });
  }

  sortTagsAlphabetically(tags) {
    tags.sort((tag1, tag2) => {
      const tag1Slug = tag1.slug.toUpperCase();
      const tag2Slug = tag2.slug.toUpperCase();
      if (tag1Slug > tag2Slug) {
        return 1;
      } else if (tag2Slug > tag1Slug) {
        return -1;
      }
      return 0;
    });
  }

  sortResourcesAlphabetically(resources) {
    resources.sort((resource1, resource2) => {
      const resource1Name = resource1.name.toUpperCase();
      const resource2Name = resource2.name.toUpperCase();
      if (resource1Name > resource2Name) {
        return 1;
      } else if (resource2Name > resource1Name) {
        return -1;
      }
      return 0;
    });
  }

  /**
   * Get the tags to display
   * @return {array} The list of tags.
   */
  getBrowsedTags() {
    let tags = this.state.tags;

    if (this.context.search.length) {
      // @todo optimization. Memoize result to avoid filtering each time the component is rendered.
      // @see reactjs doc https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#what-about-memoization
      tags = this.filterTagsBySearch(tags, this.context.search);
    }

    return tags.slice(0, BROWSED_TAGS_LIMIT);
  }

  /**
   * Filter tags by keywords.
   * Search on the slug
   * @param {array} tags The list of tags to filter.
   * @param {string} needle The needle to search.
   * @return {array} The filtered tags.
   */
  filterTagsBySearch(tags, needle) {
    // Split the search by words
    const needles = needle.split(/\s+/);
    // Prepare the regexes for each word contained in the search.
    const regexes = needles.map(needle => new RegExp(this.escapeRegExp(needle), 'i'));

    return tags.filter(tag => {
      let match = true;
      for (let i in regexes) {
        // To match a resource would have to match all the words of the search.
        match &= regexes[i].test(tag.slug);
      }

      return match;
    });
  }

  /**
   * Get the resources to display
   * @return {array} The list of resources.
   */
  getBrowsedResources() {
    let resources = this.state.resources;

    if (this.context.search.length) {
      // @todo optimization. Memoize result to avoid filtering each time the component is rendered.
      // @see reactjs doc https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#what-about-memoization
      resources = this.filterResourcesBySearch(resources, this.context.search);
    }

    return resources.slice(0, BROWSED_RESOURCES_LIMIT);
  }

  /**
   * Filter resources by keywords.
   * Search on the name, the username, the uri and the description of the resources.
   * @param {array} resources The list of resources to filter.
   * @param {string} needle The needle to search.
   * @return {array} The filtered resources.
   */
  filterResourcesBySearch(resources, needle) {
    // Split the search by words
    const needles = needle.split(/\s+/);
    // Prepare the regexes for each word contained in the search.
    const regexes = needles.map(needle => new RegExp(this.escapeRegExp(needle), 'i'));

    return resources.filter(resource => {
      let match = true;
      for (let i in regexes) {
        // To match a resource would have to match all the words of the search.
        match &= (regexes[i].test(resource.name)
          || regexes[i].test(resource.username)
          || regexes[i].test(resource.uri)
          || regexes[i].test(resource.description));
      }

      return match;
    });
  }

  /**
   * Escape a string that is to be treated as a literal string within a regular expression.
   * Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_special_characters
   * @param {string} value The string to escape
   */
  escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  isReady() {
    return this.state.tags !== null
      || this.state.resources != null;
  }

  render() {
    const isReady = this.isReady();
    const isSearching = this.context.search.length > 0;
    const listTagsOnly = this.state.selectedTag === null;
    let browsedTags, browsedResources;

    if (isReady) {
      if (listTagsOnly) {
        browsedTags = this.getBrowsedTags();
      } else {
        browsedResources = this.getBrowsedResources();
      }
    }

    return (
      <div className="index-list">
        <div className="back-link">
          <a href="#" className="primary-action" onClick={this.handleGoBackClick} title="Go back">
            <span className="icon fa">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z" /></svg>
            </span>
            <span className="primary-action-title">
              {this.state.selectedTag && this.state.selectedTag.slug || "Tags"}
            </span>
          </a>
          <Link to="/data/quickaccess.html" className="secondary-action button-icon button" title="Cancel">
            <span className="fa icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z" /></svg>
            </span>
            <span className="visually-hidden">cancel</span>
          </Link>
        </div>
        <SimpleBar className="list-container">
          <ul className="list-items">
            {!isReady &&
              <li className="empty-entry">
                <p className="processing-text">
                  {listTagsOnly ? "Retrieving your tags" : "Retrieving your passwords"}
                </p>
              </li>
            }
            {isReady &&
              <React.Fragment>
                {browsedTags &&
                  <React.Fragment>
                    {(!browsedTags.length) &&
                      <li className="empty-entry">
                        <p>
                          {isSearching && "No result match your search. Try with another search term."}
                          {!isSearching && "No passwords are yet tagged. It does feel a bit empty here, tag your first password."}
                        </p>
                      </li>
                    }
                    {(browsedTags.length > 0) &&
                      browsedTags.map((tag) => (
                        <li class="filter-entry">
                          <a href="#" onClick={(ev) => this.handleSelectTagClick(ev, tag.id)}>
                            <span class="filter">{tag.slug}</span>
                          </a>
                        </li>
                      ))
                    }
                  </React.Fragment>
                }
                {!browsedTags &&
                  <React.Fragment>
                    {!browsedResources.length &&
                      <li className="empty-entry">
                        <p>
                          {isSearching && "No result match your search. Try with another search term."}
                          {/* The below scenario should not happen */}
                          {!isSearching && "No passwords are marked with this tag yet. Mark a password with this tag or wait for a team \
                            member to mark a password with this tag."}
                        </p>
                      </li>
                    }
                    {(browsedResources.length > 0) &&
                      browsedResources.map(resource =>
                        <li className="resource-entry" key={resource.id}>
                          <a href="#" onClick={(ev) => this.handleSelectResourceClick(ev, resource.id)}>
                            <span className="title">{resource.name}</span>
                            <span className="username"> {resource.username ? `(${resource.username})` : ""}</span>
                            <span className="url">{resource.uri}</span>
                          </a>
                        </li>
                      )}
                  </React.Fragment>
                }
              </React.Fragment>
            }
          </ul>
        </SimpleBar>
      </div>
    );
  }
}

FilterResourcesByTagPage.contextType = AppContext;

FilterResourcesByTagPage.propTypes = {
  // Match, location and history props are injected by the withRouter decoration call.
  match: PropTypes.object,
  location: PropTypes.object,
  history: PropTypes.object
};

export default withRouter(FilterResourcesByTagPage);
