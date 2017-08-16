/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import VirtualSelectionStack from '../src/virtualselectionstack';

describe( 'VirtualSelectionStack', () => {
	let stack;

	beforeEach( () => {
		stack = new VirtualSelectionStack();
	} );

	it( 'should fire event when new descriptor is provided to an empty stack', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };

		stack.on( 'change:top', spy );
		stack.add( descriptor );

		sinon.assert.calledOnce( spy );
		expect( spy.firstCall.args[ 1 ].newDescriptor ).to.equal( descriptor );
		expect( spy.firstCall.args[ 1 ].oldDescriptor ).to.be.undefined;
	} );

	it( 'should fire event when new top element has changed', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };
		const secondDescriptor = { priority: 11, class: 'css-class' };

		stack.on( 'change:top', spy );
		stack.add( descriptor );
		stack.add( secondDescriptor );

		sinon.assert.calledTwice( spy );
		expect( spy.secondCall.args[ 1 ].newDescriptor ).to.equal( secondDescriptor );
		expect( spy.secondCall.args[ 1 ].oldDescriptor ).to.equal( descriptor );
	} );

	it( 'should not fire event when element with lower priority was added', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };
		const secondDescriptor = { priority: 9, class: 'css-class' };

		stack.on( 'change:top', spy );
		stack.add( descriptor );
		stack.add( secondDescriptor );

		sinon.assert.calledOnce( spy );
		expect( spy.firstCall.args[ 1 ].newDescriptor ).to.equal( descriptor );
		expect( spy.firstCall.args[ 1 ].oldDescriptor ).to.be.undefined;
	} );

	it( 'should fire event when top element was removed', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };
		const secondDescriptor = { priority: 11, class: 'css-class' };

		stack.add( descriptor );
		stack.add( secondDescriptor );

		stack.on( 'change:top', spy );

		stack.remove( secondDescriptor );

		sinon.assert.calledOnce( spy );
		expect( spy.firstCall.args[ 1 ].oldDescriptor ).to.equal( secondDescriptor );
		expect( spy.firstCall.args[ 1 ].newDescriptor ).to.equal( descriptor );
	} );

	it( 'should not fire event when other than top element is removed', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };
		const secondDescriptor = { priority: 11, class: 'css-class' };

		stack.add( descriptor );
		stack.add( secondDescriptor );

		stack.on( 'change:top', spy );

		stack.remove( descriptor );

		sinon.assert.notCalled( spy );
	} );

	it( 'should not fire event when same descriptor is added', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };
		const secondDescriptor = { priority: 10, class: 'css-class' };

		stack.on( 'change:top', spy );
		stack.add( descriptor );
		stack.add( secondDescriptor );

		sinon.assert.calledOnce( spy );
		expect( spy.firstCall.args[ 1 ].newDescriptor ).to.equal( descriptor );
		expect( spy.firstCall.args[ 1 ].oldDescriptor ).to.be.undefined;
	} );

	it( 'should not fire when trying to remove from empty stack', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };

		stack.on( 'change:top', spy );
		stack.remove( descriptor );

		sinon.assert.notCalled( spy );
	} );

	it( 'should not fire when trying to remove descriptor which is not present', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };
		const secondDescriptor = { priority: 12, class: 'css-class' };

		stack.add( descriptor );
		stack.on( 'change:top', spy );
		stack.remove( secondDescriptor );

		sinon.assert.notCalled( spy );
	} );

	it( 'should fire event when last element from stack was removed', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };

		stack.add( descriptor );
		stack.on( 'change:top', spy );
		stack.remove( descriptor );

		sinon.assert.calledOnce( spy );
		expect( spy.firstCall.args[ 1 ].newDescriptor ).to.be.undefined;
		expect( spy.firstCall.args[ 1 ].oldDescriptor ).to.equal( descriptor );
	} );

	it( 'should not fire event when new top descriptor is same as previous', () => {
		const spy = sinon.spy();
		const descriptor = { priority: 10, class: 'css-class' };
		const secondDescriptor = { priority: 10, class: 'css-class' };

		stack.add( descriptor );
		stack.add( secondDescriptor );
		stack.on( 'change:top', spy );
		stack.remove( secondDescriptor );

		sinon.assert.notCalled( spy );
	} );

	it( 'should sort by class when priorities are the same', () => {
		const spy = sinon.spy();
		const descriptorA = { priority: 10, class: 'css-a' };
		const descriptorB = { priority: 10, class: 'css-b' };
		const descriptorC = { priority: 10, class: 'css-c' };

		stack.on( 'change:top', spy );
		stack.add( descriptorB );
		stack.add( descriptorA );
		stack.add( descriptorC );

		sinon.assert.calledTwice( spy );
		expect( spy.firstCall.args[ 1 ].newDescriptor ).to.equal( descriptorB );
		expect( spy.firstCall.args[ 1 ].oldDescriptor ).to.be.undefined;

		expect( spy.secondCall.args[ 1 ].newDescriptor ).to.equal( descriptorC );
		expect( spy.secondCall.args[ 1 ].oldDescriptor ).to.equal( descriptorB );
	} );
} );
