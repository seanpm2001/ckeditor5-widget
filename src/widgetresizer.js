/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module widget/widgetresizer
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import getAncestors from '@ckeditor/ckeditor5-utils/src/dom/getancestors';
import ResizeContext from './resizecontext';
import DomEmitterMixin from '@ckeditor/ckeditor5-utils/src/dom/emittermixin';
import global from '@ckeditor/ckeditor5-utils/src/dom/global';

const WIDTH_ATTRIBUTE_NAME = 'width';

/**
 * Widget resize feature plugin.
 *
 * Use the {@link module:widget/widgetresizer~WidgetResizer#apply} method to create resizer for a provided widget.
 */
export default class WidgetResizer extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'WidgetResizer';
	}

	init() {
		this.contexts = [];
		this.activeContext = null;

		this._registerSchema();

		const mouseObserverHost = global.window.document;

		this._observers = {
			mouseMove: Object.create( DomEmitterMixin ),
			mouseDownUp: Object.create( DomEmitterMixin ),
		};

		const mouseMoveListener = ( event, domEventData ) => {
			if ( this.activeContext ) {
				this.activeContext.updateSize( domEventData );
			}
		};

		this.editor.editing.view.document.on( 'layoutChanged', () => {
			// Redrawing on layout change fixes issue with browser window resize or undo causing a mispositioned resizer.
			for ( const context of this.contexts ) {
				// This check is needed, as there were cases when widget was not yet initialized but layoutChanged happened.
				if ( context.domResizeWrapper && context.domResizeWrapper.parentElement ) {
					context.redraw();
				}
			}
		} );

		this._observers.mouseDownUp.listenTo( mouseObserverHost, 'mousedown', ( event, domEventData ) => {
			const target = domEventData.target;

			const resizeHandler = isResizeHandler( target ) ? target : getAncestors( target ).filter( isResizeHandler )[ 0 ];

			if ( resizeHandler ) {
				this._observers.mouseMove.listenTo( mouseObserverHost, 'mousemove', mouseMoveListener );

				this.activeContext = this._getContextByHandler( resizeHandler );

				if ( this.activeContext ) {
					this.activeContext.begin( resizeHandler );
				}
			}
		} );

		const finishResizing = () => {
			if ( this.activeContext ) {
				this._observers.mouseMove.stopListening( mouseObserverHost, 'mousemove', mouseMoveListener );

				if ( this.activeContext ) {
					this.activeContext.commit( this.editor );
				}

				this.activeContext = null;
			}
		};

		this._observers.mouseDownUp.listenTo( mouseObserverHost, 'mouseup', finishResizing );

		function isResizeHandler( element ) {
			return element.classList && element.classList.contains( 'ck-widget__resizer' );
		}
	}

	/**
	 * Method that applies a resizer to a given `widgetElement`.
	 *
	 * ```js
	 * conversion.for( 'editingDowncast' ).elementToElement( {
	 *		model: 'image',
	 *		view: ( modelElement, viewWriter ) => {
	 *			const widget = toImageWidget( createImageViewElement( viewWriter ), viewWriter, t( 'image widget' ) );
	 *
	 *			editor.plugins.get( 'WidgetResizer' ).apply( widget, viewWriter );
	 *
	 *			return widget;
	 *		}
	 *	} );
	 * ```
	 *
	 * You can use the `options` parameter to customize the behavior of the resizer:
	 *
	 * ```js
	 * conversion.for( 'editingDowncast' ).elementToElement( {
	 *			model: 'image',
	 *			view: ( modelElement, viewWriter ) => {
	 *				const widget = toImageWidget( createImageViewElement( viewWriter ), viewWriter, t( 'image widget' ) );
	 *
	 *				editor.plugins.get( 'WidgetResizer' ).apply( widget, viewWriter, {
	 *					getResizeHost( wrapper ) {
	 *						return wrapper.querySelector( 'img' );
	 *					},
	 *					getAspectRatio( resizeHost ) {
	 *						return resizeHost.naturalWidth / resizeHost.naturalHeight;
	 *					},
	 *					isCentered( context ) {
	 *						const imageStyle = context._getModel( editor, context.widgetWrapperElement ).getAttribute( 'imageStyle' );
	 *
	 *						return !imageStyle || imageStyle == 'full';
	 *					}
	 *				} );
	 *
	 *				return widget;
	 *			}
	 *		} );
	 * ```
	 *
	 * @param {module:engine/view/containerelement~ContainerElement} widgetElement
	 * @param {module:engine/view/downcastwriter~DowncastWriter} writer
	 * @param {module:widget/widgetresizer~ResizerOptions} [options] Resizer options.
	 */
	apply( widgetElement, writer, options ) {
		const context = new ResizeContext( options );
		context.attach( widgetElement, writer );

		this.editor.editing.view.once( 'render', () => context.redraw() );

		this.contexts.push( context );
	}

	/**
	 * Returns a resize context associated with given `domResizeWrapper`.
	 *
	 * @param {HTMLElement} domResizeWrapper
	 */
	_getContextByWrapper( domResizeWrapper ) {
		for ( const context of this.contexts ) {
			if ( domResizeWrapper.isSameNode( context.domResizeWrapper ) ) {
				return context;
			}
		}
	}

	_getContextByHandler( domResizeHandler ) {
		return this._getContextByWrapper( getAncestors( domResizeHandler )
			.filter( element => element.classList.contains( 'ck-widget__resizer-wrapper' ) )[ 0 ] );
	}

	_registerSchema() {
		this.editor.model.schema.setAttributeProperties( WIDTH_ATTRIBUTE_NAME, {
			isFormatting: true
		} );
	}
}

/**
 * Interface describing a resizer. It allows to specify resizing host, custom logic for calculating aspect ratio etc.
 *
 * @interface ResizerOptions
 */

/**
 * Function to explicitly point the resizing host.
 *
 * By default resizer will use widget wrapper, but it's possible to point any child within widget wrapper.
 *
 * ```js
 *	editor.plugins.get( 'WidgetResizer' ).apply( widget, conversionApi.writer, {
 *		getResizeHost( wrapper ) {
 *			return wrapper.querySelector( 'img' );
 *		}
 *	} );
 * ```
 *
 * @member {Function} module:widget/widgetresizer~ResizerOptions#getResizeHost
 */

/**
 * @member {Function} module:widget/widgetresizer~ResizerOptions#getAspectRatio
 */

/**
 * ```js
 *	editor.plugins.get( 'WidgetResizer' ).apply( widget, conversionApi.writer, {
 *		isCentered( context ) {
 *			const imageStyle = context._getModel( editor, context.widgetWrapperElement ).getAttribute( 'imageStyle' );
 *
 *			return !imageStyle || imageStyle == 'full';
 *		}
 *	} );
 * ```
 * @member {Function} module:widget/widgetresizer~ResizerOptions#isCentered
 */