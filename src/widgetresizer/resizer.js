/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module widget/widgetresizer/resizer
 */

import View from '@ckeditor/ckeditor5-ui/src/view';
import Template from '@ckeditor/ckeditor5-ui/src/template';
import Rect from '@ckeditor/ckeditor5-utils/src/dom/rect';

import ObservableMixin from '@ckeditor/ckeditor5-utils/src/observablemixin';
import mix from '@ckeditor/ckeditor5-utils/src/mix';

import ResizeState from './resizerstate';

/**
 * Stores the internal state of a single resizable object.
 *
 * @class Resizer
 */
export default class Resizer {
	/**
	 * @param {module:widget/widgetresizer~ResizerOptions} options Resizer options.
	 */
	constructor( options ) {
		/**
		 * @private
		 * @type {module:widget/widgetresizer~ResizerOptions}
		 */
		this._options = options;

		/**
		 * Container of the entire resize UI.
		 *
		 * Note that this property is initialized only after the element bound with the resizer is drawn
		 * so it will be a `null` when uninitialized.
		 *
		 * @private
		 * @type {HTMLElement|null}
		 */
		this._domResizeWrapper = null;

		/**
		 * Reference point of resizer where the dragging started. It is used to measure the distance to user cursor
		 * traveled, thus how much the image should be enlarged.
		 * This information is only known after DOM was rendered, so it will be updated later.
		 *
		 * @private
		 * @type {Object}
		 */
		this._referenceCoordinates = null;

		/**
		 * View to a wrapper containing all the resizer-related views.
		 *
		 * @private
		 * @type {module:engine/view/uielement~UIElement}
		 */
		this._resizeWrapperElement = null;

		/**
		 * @private
		 * @type {HTMLElement|null}
		 */
		this._domResizeShadow = null;

		this.decorate( 'begin' );
		this.decorate( 'cancel' );
		this.decorate( 'commit' );
		this.decorate( 'updateSize' );
	}

	/**
	 *
	 */
	attach() {
		const that = this;
		const viewElement = this._options.viewElement;
		const writer = this._options.downcastWriter;

		this._resizeWrapperElement = writer.createUIElement( 'div', {
			class: 'ck ck-widget__resizer-wrapper'
		}, function( domDocument ) {
			const domElement = this.toDomElement( domDocument );

			that._domResizeShadow = that._appendShadowElement( domElement );
			that._appendResizers( that._domResizeShadow );
			that._appendSizeUi( that._domResizeShadow );

			that._domResizeWrapper = domElement;

			return domElement;
		} );

		// Append resizer wrapper to the widget's wrapper.
		writer.insert( writer.createPositionAt( viewElement, 'end' ), this._resizeWrapperElement );
		writer.addClass( [ 'ck-widget_with-resizer' ], viewElement );
	}

	begin( domResizeHandle ) {
		this.state = new ResizeState( this._options );
		this.sizeUi.bindResizer( this.state );

		this.state.begin( domResizeHandle, this._getResizeHost() );

		this.redraw();
	}

	updateSize( domEventData ) {
		const resizeHost = this._getResizeHost();
		const newSize = this.state.proposeNewSize( domEventData );

		resizeHost.style.width = `${ newSize.width }px`;

		this.state.fetchSizeFromElement( this._getResizeHost() );

		// Refresh values based on real image. Real image might be limited by max-width, and thus fetching it
		// here will reflect this limitation on resizer shadow later on.
		this._domResizeWrapper.style.width = this.state.proposedWidth + 'px';
		this._domResizeWrapper.style.height = this.state.proposedHeight + 'px';
	}

	commit( editor ) {
		const modelElement = this._options.modelElement;
		const newWidth = this._domResizeShadow.clientWidth;

		this._dismissShadow();

		this.redraw();

		editor.model.change( writer => {
			writer.setAttribute( 'width', newWidth + 'px', modelElement );
		} );

		this._cleanup();
	}

	/**
	 * Cancels and rejects proposed resize dimensions hiding all the UI.
	 */
	cancel() {
		this._dismissShadow();
		this._cleanup();
	}

	destroy() {
		this.cancel();
	}

	redraw() {
		const domWrapper = this._domResizeWrapper;

		if ( existsInDom( domWrapper ) ) {
			// Refresh only if resizer exists in the DOM.
			const widgetWrapper = domWrapper.parentElement;
			const resizingHost = this._getResizeHost();
			const clientRect = new Rect( resizingHost );

			domWrapper.style.width = clientRect.width + 'px';
			domWrapper.style.height = clientRect.height + 'px';

			// In case a resizing host is not a widget wrapper, we need to compensate
			// for any additional offsets the resize host might have. E.g. wrapper padding
			// or simply another editable. By doing that the border and resizers are shown
			// only around the resize host.
			if ( !widgetWrapper.isSameNode( resizingHost ) ) {
				domWrapper.style.left = resizingHost.offsetLeft + 'px';
				domWrapper.style.top = resizingHost.offsetTop + 'px';

				domWrapper.style.height = resizingHost.offsetHeight + 'px';
				domWrapper.style.width = resizingHost.offsetWidth + 'px';
			}
		}

		function existsInDom( element ) {
			return element && element.ownerDocument && element.ownerDocument.contains( element );
		}
	}

	containsHandle( domElement ) {
		return this._domResizeWrapper.contains( domElement );
	}

	static isResizeHandle( domElement ) {
		return domElement.classList.contains( 'ck-widget__resizer' );
	}

	/**
	 * Cleans up the context state.
	 *
	 * @protected
	 */
	_cleanup() {
		this.sizeUi.dismiss();
		this.sizeUi.isVisible = false;
	}

	/**
	 * Method used to obtain the resize host.
	 *
	 * Resize host is an object that is actually resized.
	 *
	 * Resize host will not always be an entire widget itself. Take an image as an example. Image widget
	 * contains an image and caption. Only the image should be used to resize the widget, while the caption
	 * will simply follow the image size.
	 *
	 * @protected
	 * @returns {HTMLElement}
	 */
	_getResizeHost() {
		const widgetWrapper = this._domResizeWrapper.parentElement;

		return this._options.getResizeHost ?
			this._options.getResizeHost( widgetWrapper ) : widgetWrapper;
	}

	/**
	 * @protected
	 */
	_dismissShadow() {
		this._domResizeShadow.removeAttribute( 'style' );
	}

	/**
	 * @private
	 * @param {HTMLElement} domElement The outer wrapper of resize UI within a given widget.
	 */
	_appendShadowElement( domElement ) {
		const shadowElement = new Template( {
			tag: 'div',
			attributes: {
				class: 'ck ck-widget__resizer-shadow'
			}
		} ).render();

		domElement.appendChild( shadowElement );

		return shadowElement;
	}

	/**
	 * Renders the resize handles in DOM.
	 *
	 * @private
	 * @param {HTMLElement} domElement Resize shadow where the resizers should be appended to.
	 */
	_appendResizers( domElement ) {
		const resizerPositions = [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ];

		for ( const currentPosition of resizerPositions ) {
			domElement.appendChild( ( new Template( {
				tag: 'div',
				attributes: {
					class: `ck-widget__resizer ${ getResizerClass( currentPosition ) }`
				}
			} ).render() ) );
		}
	}

	/**
	 * @private
	 * @param {HTMLElement} domElement
	 */
	_appendSizeUi( domElement ) {
		const sizeUi = new SizeView();

		// Make sure icon#element is rendered before passing to appendChild().
		sizeUi.render();

		this.sizeUi = sizeUi;

		domElement.appendChild( sizeUi.element );
	}

	/**
	 * Determines the position of a given resize handle.
	 *
	 * @private
	 * @param {HTMLElement} domHandle Handler used to calculate reference point.
	 * @returns {String|undefined} Returns a string like `"top-left"` or `undefined` if not matched.
	 */
	_getHandlePosition( domHandle ) {
		const resizerPositions = [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ];

		for ( const position of resizerPositions ) {
			if ( domHandle.classList.contains( getResizerClass( position ) ) ) {
				return position;
			}
		}
	}
}

mix( Resizer, ObservableMixin );

class SizeView extends View {
	constructor() {
		super();

		const bind = this.bindTemplate;

		this.setTemplate( {
			tag: 'div',
			attributes: {
				class: [
					'ck',
					'ck-size-view',
					bind.to( 'activeHandlePosition', value => value ? `ck-orientation-${ value }` : '' )
				],
				style: {
					display: bind.if( 'isVisible', 'none', visible => !visible )
				}
			},
			children: [ {
				text: bind.to( 'label' )
			} ]
		} );
	}

	bindResizer( observable ) {
		this.bind( 'isVisible' ).to( observable, 'proposedWidth', observable, 'proposedHeight', ( x, y ) =>
			x !== null && y !== null );

		this.bind( 'label' ).to( observable, 'proposedWidth', observable, 'proposedHeight', ( x, y ) =>
			`${ Math.round( x ) }x${ Math.round( y ) }` );

		this.bind( 'activeHandlePosition' ).to( observable );
	}

	dismiss() {
		this.unbind();
		this.isVisible = false;
	}
}

// @param {String} resizerPosition Expected resizer position like `"top-left"`, `"bottom-right"`.
// @returns {String} A prefixed HTML class name for the resizer element
function getResizerClass( resizerPosition ) {
	return `ck-widget__resizer-${ resizerPosition }`;
}